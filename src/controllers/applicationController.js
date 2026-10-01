const Application = require("../models/Application");
const { normalizeKgPhone } = require("../services/smsService");
const { notifyManager } = require("../services/emailService");

function publicView(application) {
  return {
    id: application._id,
    name: application.name,
    course: application.course,
    phone: application.phone,
    language: application.language || "ru",
    status: application.status,
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
    const language = req.body.language === "ky" ? "ky" : "ru";

    const application = await Application.create({ name, course, message, phone, language });
    await tryNotifyManager(application);

    return res.status(201).json({
      success: true,
      application: publicView(application),
    });
  } catch (err) {
    console.error("[applications] Ошибка создания заявки:", err);
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
  listApplications,
  updateApplicationStatus,
};