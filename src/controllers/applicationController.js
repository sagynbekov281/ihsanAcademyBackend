const Application = require("../models/Application");
const { sendSms, normalizeKgPhone } = require("../services/smsService");
const { notifyManager } = require("../services/emailService");

const OTP_TTL_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

// Проверка номера по SMS-коду включается в .env строкой REQUIRE_OTP=true
const REQUIRE_OTP = process.env.REQUIRE_OTP === "true";

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function publicView(application) {
  return {
    id: application._id,
    name: application.name,
    course: application.course,
    phone: application.phone,
    status: application.status,
    smsStatus: application.smsStatus,
    phoneVerified: application.phoneVerified,
    createdAt: application.createdAt,
  };
}

async function tryNotifyManager(application) {
  try {
    const result = await notifyManager(application);
    if (result && result.ok) {
      application.managerNotified = true;
      await application.save();
    }
  } catch (emailErr) {
    console.error("[email] Не удалось уведомить менеджера:", emailErr.message);
  }
}

async function createApplication(req, res) {
  try {
    const name = String(req.body.name).trim();
    const course = String(req.body.course).trim();
    const message = req.body.message ? String(req.body.message).trim() : "";
    const phone = normalizeKgPhone(req.body.phone);

    // Режим без SMS: заявка сразу принимается
    if (!REQUIRE_OTP) {
      const application = await Application.create({ name, course, message, phone });
      await tryNotifyManager(application);

      return res.status(201).json({
        success: true,
        needsVerification: false,
        application: publicView(application),
      });
    }

    // Режим с SMS-кодом
    const otpCode = generateOtpCode();
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    const application = await Application.create({
      name,
      course,
      message,
      phone,
      otpCode,
      otpExpiresAt,
      otpAttempts: 0,
      phoneVerified: false,
    });

    const smsText = `IhsanAcademy: vash kod podtverzhdeniya - ${otpCode}. Kod deystvitelen ${OTP_TTL_MINUTES} minut.`;

    try {
      const smsResult = await sendSms(phone, smsText);
      console.log("[sms] Ответ от провайдера:", JSON.stringify(smsResult));
      application.smsStatus = "sent";
    } catch (smsErr) {
      console.error("[sms] Не удалось отправить SMS:", smsErr.message);
      application.smsStatus = "failed";
      application.smsError = smsErr.message;
    }

    await application.save();

    return res.status(201).json({
      success: true,
      needsVerification: true,
      application: publicView(application),
    });
  } catch (err) {
    console.error("[applications] Ошибка создания заявки:", err);
    return res.status(500).json({ success: false, error: "Внутренняя ошибка сервера" });
  }
}

async function verifyOtp(req, res) {
  try {
    const { id } = req.params;
    const code = String(req.body.code || "").trim();

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, error: "Заявка не найдена" });
    }

    if (application.phoneVerified) {
      return res.json({ success: true, alreadyVerified: true, application: publicView(application) });
    }

    if (!application.otpCode || !application.otpExpiresAt || application.otpExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        error: "Код истёк. Нажмите «Отправить код ещё раз».",
        expired: true,
      });
    }

    if (application.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        error: "Слишком много неверных попыток. Запросите новый код.",
      });
    }

    if (code !== application.otpCode) {
      application.otpAttempts += 1;
      await application.save();
      return res.status(400).json({
        success: false,
        error: "Неверный код",
        attemptsLeft: MAX_OTP_ATTEMPTS - application.otpAttempts,
      });
    }

    application.phoneVerified = true;
    application.otpCode = null;
    application.otpExpiresAt = null;
    await application.save();

    await tryNotifyManager(application);

    return res.json({ success: true, application: publicView(application) });
  } catch (err) {
    console.error("[applications] Ошибка проверки кода:", err);
    return res.status(500).json({ success: false, error: "Внутренняя ошибка сервера" });
  }
}

async function resendOtp(req, res) {
  try {
    const { id } = req.params;
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, error: "Заявка не найдена" });
    }
    if (application.phoneVerified) {
      return res.status(400).json({ success: false, error: "Номер уже подтверждён" });
    }

    const otpCode = generateOtpCode();
    application.otpCode = otpCode;
    application.otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    application.otpAttempts = 0;

    const smsText = `IhsanAcademy: vash kod podtverzhdeniya - ${otpCode}. Kod deystvitelen ${OTP_TTL_MINUTES} minut.`;

    try {
      const smsResult = await sendSms(application.phone, smsText);
      console.log("[sms] Ответ от провайдера (resend):", JSON.stringify(smsResult));
      application.smsStatus = "sent";
    } catch (smsErr) {
      console.error("[sms] Не удалось отправить SMS:", smsErr.message);
      application.smsStatus = "failed";
      application.smsError = smsErr.message;
    }

    await application.save();

    return res.json({ success: true, application: publicView(application) });
  } catch (err) {
    console.error("[applications] Ошибка повторной отправки кода:", err);
    return res.status(500).json({ success: false, error: "Внутренняя ошибка сервера" });
  }
}

async function listApplications(req, res) {
  try {
    const applications = await Application.find().sort({ createdAt: -1 }).limit(500);
    return res.json({ success: true, count: applications.length, applications });
  } catch (err) {
    console.error("[applications] Ошибка получения списка:", err);
    return res.status(500).json({ success: false, error: "Внутренняя ошибка сервера" });
  }
}

async function updateApplicationStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, error: "Некорректный статус" });
    }

    const application = await Application.findByIdAndUpdate(id, { status }, { new: true });
    if (!application) {
      return res.status(404).json({ success: false, error: "Заявка не найдена" });
    }

    return res.json({ success: true, application });
  } catch (err) {
    console.error("[applications] Ошибка обновления статуса:", err);
    return res.status(500).json({ success: false, error: "Внутренняя ошибка сервера" });
  }
}

module.exports = {
  createApplication,
  verifyOtp,
  resendOtp,
  listApplications,
  updateApplicationStatus,
};