// Бесплатный перевод русский <-> кыргызский. Ключ не нужен.
// Неофициальный адрес Google Translate: есть лимиты, поэтому запросы идут по одному,
// с паузой, при 429 делаем повтор, а готовые переводы кэшируем.
const ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const TIMEOUT_MS = 15000;
const MAX_CHUNK = 1500;
const GAP_MS = 700;        // пауза между запросами
const RETRIES = 4;         // сколько раз пробуем при 429/5xx

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cache = new Map();   // "ru|ky|текст" -> перевод

let nextSlot = 0;
async function throttle() {
  const now = Date.now();
  const at = Math.max(now, nextSlot);
  nextSlot = at + GAP_MS;
  if (at > now) await sleep(at - now);
}

function chunkText(text) {
  if (text.length <= MAX_CHUNK) return [text];
  const parts = text.split(/(?<=[.!?…\n])\s+/);
  const chunks = [];
  let cur = "";
  for (const p of parts) {
    if (cur && (cur + " " + p).length > MAX_CHUNK) {
      chunks.push(cur);
      cur = p;
    } else {
      cur = cur ? cur + " " + p : p;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

async function requestOnce(text, from, to) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${ENDPOINT}?client=gtx&sl=${from}&tl=${to}&dt=t`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        "user-agent": "Mozilla/5.0",
      },
      body: new URLSearchParams({ q: text }).toString(),
    });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.retryable = res.status === 429 || res.status >= 500;
      throw err;
    }
    const data = await res.json();
    const out = Array.isArray(data && data[0]) ? data[0].map((p) => (p && p[0]) || "").join("") : "";
    if (!out.trim()) throw new Error("пустой ответ");
    return out.trim();
  } catch (e) {
    if (e.name === "AbortError") e.retryable = true;
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function translateChunk(text, from, to) {
  const key = `${from}|${to}|${text}`;
  if (cache.has(key)) return cache.get(key);
  for (let i = 0; i < RETRIES; i++) {
    await throttle();
    try {
      const out = await requestOnce(text, from, to);
      if (cache.size > 500) cache.clear();
      cache.set(key, out);
      return out;
    } catch (e) {
      if (!e.retryable || i === RETRIES - 1) throw e;
      await sleep(2000 * (i + 1)); // 2с, 4с, 6с
    }
  }
}

async function translateText(text, from, to) {
  const out = [];
  for (const chunk of chunkText(text)) out.push(await translateChunk(chunk, from, to));
  return out.join(" ");
}

// fields: { ключ: "текст" } -> { texts: { ключ: "перевод" }, failed: boolean }
async function translateFields(fields, from, to) {
  const texts = {};
  let failed = false;
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value !== "string" || !value.trim()) continue;
    try {
      texts[key] = await translateText(value.trim(), from, to);
    } catch (err) {
      failed = true;
      console.error(`[translate] ${from}->${to} не удалось (${key}):`, err.message);
    }
  }
  return { texts, failed };
}

module.exports = { translateFields };