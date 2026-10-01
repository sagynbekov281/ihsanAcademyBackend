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
    return "996" + digits;
  }
  return null;
}

function isValidKgPhone(rawPhone) {
  return normalizeKgPhone(rawPhone) !== null;
}

module.exports = { normalizeKgPhone, isValidKgPhone };