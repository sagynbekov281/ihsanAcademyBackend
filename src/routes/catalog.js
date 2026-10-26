const express = require("express");
const rateLimit = require("express-rate-limit");
const { courses, teachers, seed } = require("../controllers/catalogController");
const { testimonials, translate } = require("../controllers/contentController");
const { login, requireAdmin } = require("../middleware/adminAuth");

// Публичные: их читает сайт
const publicRouter = express.Router();
publicRouter.get("/courses", courses.listPublic);
publicRouter.get("/teachers", teachers.listPublic);
publicRouter.get("/testimonials", testimonials.listPublic);

// Админские: вход по паролю, дальше всё только с токеном
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Слишком много попыток входа. Подождите 15 минут." },
});

const adminRouter = express.Router();
adminRouter.post("/login", loginLimiter, login);
adminRouter.use(requireAdmin);

adminRouter.get("/courses", courses.list);
adminRouter.post("/courses", courses.create);
adminRouter.put("/courses/:id", courses.update);
adminRouter.delete("/courses/:id", courses.remove);

adminRouter.get("/teachers", teachers.list);
adminRouter.post("/teachers", teachers.create);
adminRouter.put("/teachers/:id", teachers.update);
adminRouter.delete("/teachers/:id", teachers.remove);

// Отзывы
adminRouter.get("/testimonials", testimonials.list);
adminRouter.post("/testimonials", testimonials.create);
adminRouter.put("/testimonials/:id", testimonials.update);
adminRouter.delete("/testimonials/:id", testimonials.remove);
adminRouter.post("/seed/testimonials", testimonials.seed);

// Кнопки «Перевести» в админке
adminRouter.post("/translate", translate);

adminRouter.post("/seed/:kind", seed);

module.exports = { publicRouter, adminRouter };