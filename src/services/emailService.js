const fetch = require("node-fetch");

async function notifyManager(application) {
  const apiKey = process.env.RESEND_API_KEY;
  const managerEmail = process.env.MANAGER_EMAIL;
  const fromEmail = process.env.MANAGER_EMAIL_FROM || "onboarding@resend.dev";

  if (!apiKey || !managerEmail) {
    console.log("[email] RESEND_API_KEY / MANAGER_EMAIL не заданы в .env — письмо не отправлено.");
    return { ok: false, skipped: true };
  }

  const html = `
    <h2>Новая заявка на курс — IhsanAcademy</h2>
    <p><b>Имя:</b> ${escapeHtml(application.name)}</p>
    <p><b>Телефон:</b> +${escapeHtml(application.phone)}</p>
    <p><b>Курс:</b> ${escapeHtml(application.course)}</p>
    ${application.message ? `<p><b>Сообщение:</b> ${escapeHtml(application.message)}</p>` : ""}
    <p><b>Номер проверен по SMS-коду:</b> ${
      application.phoneVerified ? "да ✅" : "нет (проверка по SMS отключена)"
    }</p>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: managerEmail,
      subject: `Новая заявка: ${application.name} — ${application.course}`,
      html,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Resend вернул ошибку: ${JSON.stringify(data)}`);
  }

  return { ok: true, raw: data };
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

module.exports = { notifyManager };