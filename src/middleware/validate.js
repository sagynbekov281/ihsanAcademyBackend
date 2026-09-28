const { normalizeKgPhone } = require("../services/smsService");
const { requireAdmin } = require("./adminAuth");

// Мобильные номера Кыргызстана: 996 + 9 цифр, первая цифра 2, 5, 7 или 9.
function isValidKgMobile(rawPhone) {
  const normalized = normalizeKgPhone(rawPhone);
  return !!normalized && /^996[2579]\d{8}$/.test(normalized);
}

function validateApplication(req, res, next) {
  const { name, phone, course } = req.body || {};

  const errors = [];

  if (!name || String(name).trim().length < 2) {
    errors.push("Укажите имя");
  }
  if (!course || !String(course).trim()) {
    errors.push("Укажите выбранный курс");
  }
  if (!phone || !isValidKgMobile(phone)) {
    errors.push("Укажите корректный мобильный номер Кыргызстана (например +996 700 123 456)");
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
}

// Теперь принимает токен из входа по паролю (и x-admin-key для curl)
module.exports = { validateApplication, requireAdminKey: requireAdmin };