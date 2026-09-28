const crypto = require("crypto");

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // сессия 12 часов

// Пароль админки: ADMIN_PASSWORD, а если не задан — старый ADMIN_API_KEY
const getPassword = () => process.env.ADMIN_PASSWORD || process.env.ADMIN_API_KEY || "";
const getSecret = () => process.env.ADMIN_TOKEN_SECRET || getPassword();

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

const sign = (payload) =>
  crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");

function createToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (!token || !getSecret()) return false;
  const [payload, sig] = String(token).split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return false;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now();
  } catch {
    return false;
  }
}

function login(req, res) {
  const password = getPassword();
  if (!password) {
    return res.status(500).json({ success: false, error: "На сервере не задан ADMIN_PASSWORD в .env" });
  }
  if (!safeEqual((req.body && req.body.password) || "", password)) {
    return res.status(401).json({ success: false, error: "Неверный пароль" });
  }
  return res.json({ success: true, token: createToken() });
}

function requireAdmin(req, res, next) {
  const password = getPassword();
  if (password) {
    const auth = req.header("authorization") || "";
    if (auth.startsWith("Bearer ") && verifyToken(auth.slice(7))) return next();
    const key = req.header("x-admin-key"); // для curl
    if (key && safeEqual(key, password)) return next();
  }
  return res.status(401).json({ success: false, error: "Не авторизован" });
}

module.exports = { login, requireAdmin };