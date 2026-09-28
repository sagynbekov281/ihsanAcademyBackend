const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  createApplication,
  verifyOtp,
  resendOtp,
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

const verifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Слишком много попыток. Попробуйте позже." },
});

const resendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Слишком много повторных отправок. Попробуйте позже." },
});

router.post("/", submitLimiter, validateApplication, createApplication);
router.post("/:id/verify-otp", verifyLimiter, verifyOtp);
router.post("/:id/resend-otp", resendLimiter, resendOtp);

router.get("/", requireAdminKey, listApplications);
router.patch("/:id/status", requireAdminKey, updateApplicationStatus);

module.exports = router;