const Course = require("../models/Course");
const Teacher = require("../models/Teacher");
const { COURSES, TEACHERS } = require("../seed/defaults");

const LEVELS = ["beginner", "intermediate", "advanced"];
const LEVEL_LABELS = { beginner: "Начальный", intermediate: "Средний", advanced: "Продвинутый" };

const str = (v, max) => String(v ?? "").trim().slice(0, max);
const num = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};
const list = (v) =>
  (Array.isArray(v) ? v : String(v ?? "").split(/[\n,]/))
    .map((s) => String(s).trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 40);
const bool = (v) => v !== false && v !== "false";
const initials = (name) =>
  String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

// Скидка действует, пока не прошла дата окончания (до конца этого дня)
function parseEndDate(v) {
  if (!v) return null;
  const d = new Date(`${String(v).slice(0, 10)}T23:59:59`);
  return isNaN(d.getTime()) ? null : d;
}

function discountInfo(c) {
  const pct = Math.min(100, Math.max(0, c.discountPercent || 0));
  const active = pct > 0 && (!c.discountEndsAt || new Date(c.discountEndsAt) > new Date());
  return { active, pct, finalPrice: active ? Math.round(c.price * (1 - pct / 100)) : c.price };
}

// ---- Курсы ----
function courseFromBody(b) {
  return {
    title: str(b.title, 120),
    description: str(b.description, 1000),
    about: str(b.about, 3000),
    duration: str(b.duration, 60),
    levelKey: LEVELS.includes(b.levelKey) ? b.levelKey : "beginner",
    iconKey: str(b.iconKey, 30) || "code",
    price: Math.max(0, num(b.price)),
    discountPercent: Math.min(100, Math.max(0, num(b.discountPercent))),
    discountEndsAt: parseEndDate(b.discountEndsAt),
    topics: list(b.topics),
    langs: list(b.langs),
    students: Math.max(0, num(b.students)),
    projects: Math.max(0, num(b.projects)),
    order: num(b.order),
    active: bool(b.active),
  };
}

const courseAdmin = (c) => ({ ...c.toObject(), finalPrice: discountInfo(c).finalPrice, discountActive: discountInfo(c).active });

function coursePublic(c) {
  const d = discountInfo(c);
  return {
    id: String(c._id),
    title: c.title,
    description: c.description,
    about: c.about,
    duration: c.duration,
    levelKey: c.levelKey,
    level: LEVEL_LABELS[c.levelKey] || "",
    iconKey: c.iconKey,
    topics: c.topics,
    langs: c.langs,
    students: c.students,
    projects: c.projects,
    price: c.price,
    finalPrice: d.finalPrice,
    discountPercent: d.active ? d.pct : 0,
    discountEndsAt: d.active && c.discountEndsAt
      ? c.discountEndsAt.toISOString().slice(0, 10)
      : null,
  };
}

// ---- Учителя ----
const teacherFromBody = (b) => ({
  name: str(b.name, 120),
  role: str(b.role, 120),
  experience: str(b.experience, 120),
  subjects: list(b.subjects),
  bio: str(b.bio, 2000),
  order: num(b.order),
  active: bool(b.active),
});

const teacherAdmin = (t) => t.toObject();
const teacherPublic = (t) => ({
  id: String(t._id),
  name: t.name,
  role: t.role,
  experience: t.experience,
  subjects: t.subjects,
  bio: t.bio,
  initials: initials(t.name),
});

// ---- Общий CRUD ----
const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ success: false, error: "Не найдено" });
    console.error("[catalog]", err);
    res.status(500).json({ success: false, error: "Внутренняя ошибка сервера" });
  }
};

function makeCrud({ Model, plural, single, fromBody, required, missingMsg, toAdmin, toPublic }) {
  const sort = { order: 1, createdAt: 1 };
  const validate = (data, res) => {
    if (!data[required]) {
      res.status(400).json({ success: false, error: missingMsg });
      return false;
    }
    return true;
  };
  return {
    listPublic: wrap(async (req, res) => {
      res.set("Cache-Control", "no-store");
      const items = await Model.find({ active: true }).sort(sort);
      res.json({ success: true, [plural]: items.map(toPublic) });
    }),
    list: wrap(async (req, res) => {
      const items = await Model.find().sort(sort);
      res.json({ success: true, [plural]: items.map(toAdmin) });
    }),
    create: wrap(async (req, res) => {
      const data = fromBody(req.body || {});
      if (!validate(data, res)) return;
      const item = await Model.create(data);
      res.status(201).json({ success: true, [single]: toAdmin(item) });
    }),
    update: wrap(async (req, res) => {
      const data = fromBody(req.body || {});
      if (!validate(data, res)) return;
      const item = await Model.findByIdAndUpdate(req.params.id, data, { new: true });
      if (!item) return res.status(404).json({ success: false, error: "Не найдено" });
      res.json({ success: true, [single]: toAdmin(item) });
    }),
    remove: wrap(async (req, res) => {
      const item = await Model.findByIdAndDelete(req.params.id);
      if (!item) return res.status(404).json({ success: false, error: "Не найдено" });
      res.json({ success: true });
    }),
  };
}

const courses = makeCrud({
  Model: Course, plural: "courses", single: "course", fromBody: courseFromBody,
  required: "title", missingMsg: "Укажите название курса", toAdmin: courseAdmin, toPublic: coursePublic,
});
const teachers = makeCrud({
  Model: Teacher, plural: "teachers", single: "teacher", fromBody: teacherFromBody,
  required: "name", missingMsg: "Укажите имя учителя", toAdmin: teacherAdmin, toPublic: teacherPublic,
});

// Загрузка примеров — только если список пуст
const seed = wrap(async (req, res) => {
  const map = { courses: [Course, COURSES], teachers: [Teacher, TEACHERS] };
  const target = map[req.params.kind];
  if (!target) return res.status(400).json({ success: false, error: "Неизвестный раздел" });
  const [Model, docs] = target;
  if ((await Model.countDocuments()) > 0) {
    return res.status(400).json({ success: false, error: "Список не пустой — примеры не загружены" });
  }
  await Model.insertMany(docs.map((d, i) => ({ ...d, order: i })));
  res.json({ success: true });
});

module.exports = { courses, teachers, seed };