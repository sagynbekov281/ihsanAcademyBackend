// controllers/adminController.js
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Course = require("../models/Course");
const Teacher = require("../models/Teacher");
const Application = require("../models/Application");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRE = process.env.JWT_EXPIRE || "7d";

// ===== AUTHENTICATION =====

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Валидация
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email и пароль обязательны" 
      });
    }

    // Поиск админа
    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: "Неверный email или пароль" 
      });
    }

    // Проверка пароля
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: "Неверный email или пароль" 
      });
    }

    // Создание JWT токена
    const token = jwt.sign(
      { id: admin._id, email: admin.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    res.json({
      success: true,
      message: "Вы успешно вошли",
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res) => {
  res.json({
    success: true,
    message: "Вы вышли из системы",
  });
};

// ===== COURSES =====

exports.getCourses = async (req, res, next) => {
  try {
    const courses = await Course.find().populate("teacher");
    res.json({ success: true, data: courses });
  } catch (error) {
    next(error);
  }
};

exports.createCourse = async (req, res, next) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!course) {
      return res.status(404).json({ success: false, message: "Курс не найден" });
    }
    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

exports.deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: "Курс не найден" });
    }
    res.json({ success: true, message: "Курс удален" });
  } catch (error) {
    next(error);
  }
};

// ===== TEACHERS =====

exports.getTeachers = async (req, res, next) => {
  try {
    const teachers = await Teacher.find();
    res.json({ success: true, data: teachers });
  } catch (error) {
    next(error);
  }
};

exports.createTeacher = async (req, res, next) => {
  try {
    const teacher = await Teacher.create(req.body);
    res.status(201).json({ success: true, data: teacher });
  } catch (error) {
    next(error);
  }
};

exports.updateTeacher = async (req, res, next) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Учитель не найден" });
    }
    res.json({ success: true, data: teacher });
  } catch (error) {
    next(error);
  }
};

exports.deleteTeacher = async (req, res, next) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Учитель не найден" });
    }
    res.json({ success: true, message: "Учитель удален" });
  } catch (error) {
    next(error);
  }
};

// ===== APPLICATIONS =====

exports.getApplications = async (req, res, next) => {
  try {
    const applications = await Application.find().sort({ createdAt: -1 });
    res.json({ success: true, data: applications });
  } catch (error) {
    next(error);
  }
};

exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!application) {
      return res.status(404).json({ success: false, message: "Заявка не найдена" });
    }
    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
};