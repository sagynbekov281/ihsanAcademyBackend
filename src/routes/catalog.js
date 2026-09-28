const express = require("express");
const rateLimit = require("express-rate-limit");
const { courses, teachers, seed } = require("../controllers/catalogController");
const { login, requireAdmin } = require("../middleware/adminAuth");

// Публичные: их читает сайт
const publicRouter = express.Router();
publicRouter.get("/courses", courses.listPublic);
publicRouter.get("/teachers", teachers.listPublic);

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

adminRouter.post("/seed/:kind", seed);

module.exports = { publicRouter, adminRouter };