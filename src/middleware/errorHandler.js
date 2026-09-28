function notFound(req, res) {
  res.status(404).json({ success: false, error: "Маршрут не найден" });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(500).json({ success: false, error: "Внутренняя ошибка сервера" });
}

module.exports = { notFound, errorHandler };
