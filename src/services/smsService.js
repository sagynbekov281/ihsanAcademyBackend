const fetch = require("node-fetch");

/**
 * Нормализует номер телефона Кыргызстана в формат 996XXXXXXXXX (12 цифр, без +).
 * Принимает варианты: +996700123456, 996700123456, 0700123456, 0 700 123 456 и т.п.
 */
function normalizeKgPhone(rawPhone) {
  const digits = String(rawPhone).replace(/\D/g, "");

  if (digits.startsWith("996") && digits.length === 12) {
    return digits;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return "996" + digits.slice(1);
  }
  if (digits.length === 9) {
    // например 700123456
    return "996" + digits;
  }
  return null; // не похоже на кыргызский номер
}

function isValidKgPhone(rawPhone) {
  return normalizeKgPhone(rawPhone) !== null;
}

/**
 * console-провайдер: ничего не отправляет, просто логирует.
 * Удобно для разработки и для первого запуска до подключения реального SMS-аккаунта.
 */
async function sendViaConsole(phone, text) {
  console.log(`[sms:console] -> +${phone}: ${text}`);
  return { ok: true, provider: "console" };
}

/**
 * Экранирует спецсимволы для безопасной вставки текста внутрь XML.
 */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Генерирует короткий случайный ID транзакции (нужен Nikita для каждой отправки).
 */
function generateTransactionId() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * smspro.nikita.kg — локальный кыргызстанский SMS-провайдер.
 * Реальный формат API (подтверждён примером из личного кабинета, вкладка "API-интеграция"):
 * POST https://smspro.nikita.kg/api/message, тело — XML, Content-Type: application/xml
 */
async function sendViaNikita(phone, text) {
  const login = process.env.NIKITA_LOGIN;
  const password = process.env.NIKITA_PASSWORD;
  const sender = process.env.NIKITA_SENDER || "SMSPRO.KG";

  if (!login || !password) {
    throw new Error("NIKITA_LOGIN / NIKITA_PASSWORD не заданы в .env");
  }

  const transactionId = generateTransactionId();

  const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<message>
    <login>${escapeXml(login)}</login>
    <pwd>${escapeXml(password)}</pwd>
    <id>${transactionId}</id>
    <sender>${escapeXml(sender)}</sender>
    <text>${escapeXml(text)}</text>
    <phones>
        <phone>${phone}</phone>
    </phones>
</message>`;

  const res = await fetch("https://smspro.nikita.kg/api/message", {
    method: "POST",
    headers: {
      "Content-Type": "application/xml",
      "Content-Length": Buffer.byteLength(xmlData),
    },
    body: xmlData,
  });

  const body = await res.text();

  if (!res.ok) {
    throw new Error(`Nikita SMS API вернул ошибку HTTP ${res.status}: ${body}`);
  }

  // У Nikita нет официально задокументированной JSON-схемы ответа под рукой, поэтому
  // проверяем на наличие тега <error> в ответе — если есть, считаем отправку неудачной.
  const errorMatch = body.match(/<error>([\s\S]*?)<\/error>/i);
  if (errorMatch) {
    throw new Error(`Nikita вернула ошибку: ${errorMatch[1]}`);
  }

  return { ok: true, provider: "nikita", transactionId, raw: body };
}

/**
 * smsc.ru — международный SMS-провайдер, тоже доставляет в Кыргызстан.
 * Документация: https://smsc.ru/api/
 */
async function sendViaSmsc(phone, text) {
  const login = process.env.SMSC_LOGIN;
  const password = process.env.SMSC_PASSWORD;
  const sender = process.env.SMSC_SENDER || "IhsanAcademy";

  if (!login || !password) {
    throw new Error("SMSC_LOGIN / SMSC_PASSWORD не заданы в .env");
  }

  const url = new URL("https://smsc.ru/sys/send.php");
  url.searchParams.set("login", login);
  url.searchParams.set("psw", password);
  url.searchParams.set("phones", "+" + phone);
  url.searchParams.set("mes", text);
  url.searchParams.set("sender", sender);
  url.searchParams.set("charset", "utf-8");
  url.searchParams.set("fmt", "3"); // json

  const res = await fetch(url.toString(), { method: "GET" });
  const data = await res.json();

  if (data.error) {
    throw new Error(`SMSC ошибка ${data.error_code}: ${data.error}`);
  }

  return { ok: true, provider: "smsc", raw: data };
}

async function sendSms(rawPhone, text) {
  const phone = normalizeKgPhone(rawPhone);
  if (!phone) {
    throw new Error("Некорректный номер телефона");
  }

  const provider = (process.env.SMS_PROVIDER || "console").toLowerCase();

  switch (provider) {
    case "nikita":
      return sendViaNikita(phone, text);
    case "smsc":
      return sendViaSmsc(phone, text);
    case "console":
    default:
      return sendViaConsole(phone, text);
  }
}

module.exports = { sendSms, normalizeKgPhone, isValidKgPhone };