const express = require("express");
const rateLimit = require("express-rate-limit");
const Application = require("../models/Application");
const {
  createApplication,
  listApplications,
  updateApplicationStatus,
} = require("../controllers/applicationController");
const { validateApplication, requireAdminKey } = require("../middleware/validate");

const router = express.Router();

const submitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Слишком много заявок. Попробуйте позже." },
});

async function deleteApplication(req, res) {
  try {
    const item = await Application.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: "Заявка не найдена" });
    return res.json({ success: true });
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ success: false, error: "Заявка не найдена" });
    console.error("[applications] Ошибка удаления:", err);
    return res.status(500).json({ success: false, error: "Внутренняя ошибка сервера" });
  }
}

router.post("/", submitLimiter, validateApplication, createApplication);

router.get("/", requireAdminKey, listApplications);
router.patch("/:id/status", requireAdminKey, updateApplicationStatus);
router.delete("/:id", requireAdminKey, deleteApplication);

module.exports = router;