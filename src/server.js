require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const applicationsRouter = require("./routes/applications");
const { publicRouter, adminRouter } = require("./routes/catalog");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(express.json());

// Приводим адрес к единому виду: без пробелов, без "/" на конце
const clean = (s) => String(s || "").trim().replace(/\/+$/, "");

// Адреса из переменных окружения Render (через запятую).
// Читаются обе переменные: CORS_ORIGINS и CLIENT_ORIGIN.
const fromEnv = [process.env.CORS_ORIGINS, process.env.CLIENT_ORIGIN]
  .filter(Boolean)
  .join(",")
  .split(",")
  .map(clean)
  .filter(Boolean);

// Адреса, которым разрешено обращаться к API из браузера
const allowedOrigins = [
  "http://localhost:5173",
  // основной домен сайта
  "https://ihsan-academy.org.kg",
  "https://www.ihsan-academy.org.kg",
  // адреса на vercel.app
  "https://ihsan-academy.vercel.app",
  "https://ihsan-academy-ghf9.vercel.app",
  // админка
  "https://ihsan-academy-admin.vercel.app",
  // всё, что добавлено в переменные окружения
  ...fromEnv,
].map(clean);

const localhostRegex = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(
  cors((req, callback) => {
    const origin = clean(req.header("Origin"));

    let allowed = false;

    if (!origin) {
      allowed = true; // curl, Postman и т.п.
    } else if (allowedOrigins.includes(origin)) {
      allowed = true; // адреса из белого списка
    } else if (localhostRegex.test(origin)) {
      allowed = true; // любой localhost-порт при разработке
    } else {
      try {
        // тот же хост, что и у самого сервера
        allowed = new URL(origin).host === req.header("Host");
      } catch (e) {
        allowed = false;
      }
    }

    callback(null, { origin: allowed });
  })
);

// Health checks
app.get("/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get("/health/full", async (req, res) => {
  try {
    res.json({
      ok: true,
      database: "connected",
      time: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

// Админ-панель: http://localhost:5000/admin.html
app.use(express.static(path.join(__dirname, "../public")));

app.use("/api/applications", applicationsRouter);
app.use("/api/admin", adminRouter);
app.use("/api", publicRouter);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[server] Запущен на порту ${PORT}`);
      console.log(`[server] Разрешены origins:`, allowedOrigins);
    });
  })
  .catch((err) => {
    console.error("[server] Не удалось подключиться к базе данных:", err.message);
    process.exit(1);
  });