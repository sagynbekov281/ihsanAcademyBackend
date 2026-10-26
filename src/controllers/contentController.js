const Testimonial = require("../models/Testimonial");
const { translateFields } = require("../services/translateService");

const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (e) {
    if (e.name === "ValidationError" || e.name === "CastError") {
      const msg = Object.values(e.errors || {}).map((x) => x.message).join("; ");
      return res.status(400).json({ success: false, error: msg || "Некорректные данные" });
    }
    next(e);
  }
};

// Автоперевод при сохранении:
//  - написали только по-кыргызски  -> переводим на русский
//  - кыргызского нет, или русский поменяли, а кыргызский руками не правили -> переводим на кыргызский
async function applyTranslation(data, existing, pairs) {
  const toKy = {};
  const toRu = {};
  for (const [ru, ky] of Object.entries(pairs)) {
    const ruVal = String(data[ru] ?? existing?.[ru] ?? "").trim();
    const kyGiven = String(data[ky] ?? "").trim();
    const kyVal = String(data[ky] ?? existing?.[ky] ?? "").trim();
    if (!ruVal && kyVal) { toRu[ru] = kyVal; continue; }
    if (!ruVal) continue;
    const prevKy = String(existing?.[ky] ?? "");
    const manuallyEdited = existing && kyGiven && kyGiven !== prevKy;
    const ruChanged = existing && data[ru] !== undefined && data[ru] !== existing[ru];
    if (manuallyEdited) continue;
    if (!kyGiven || ruChanged) toKy[ky] = ruVal;
  }
  const a = await translateFields(toKy, "ru", "ky");
  const b = await translateFields(toRu, "ky", "ru");
  Object.assign(data, a.texts, b.texts);
}

function makeResource({ Model, key, allowed, pairs, pick, seedItems }) {
  const clean = (body = {}) => {
    const data = {};
    for (const f of allowed) if (body[f] !== undefined) data[f] = body[f];
    return data;
  };
  return {
    listPublic: wrap(async (req, res) => {
      const docs = await Model.find({ active: true }).sort({ order: 1, createdAt: 1 }).lean();
      res.json({ success: true, [key]: docs.map(pick) });
    }),
    list: wrap(async (req, res) => {
      const docs = await Model.find().sort({ order: 1, createdAt: 1 }).lean();
      res.json({ success: true, [key]: docs });
    }),
    create: wrap(async (req, res) => {
      const data = clean(req.body);
      await applyTranslation(data, null, pairs);
      const item = await Model.create(data);
      res.status(201).json({ success: true, item });
    }),
    update: wrap(async (req, res) => {
      const existing = await Model.findById(req.params.id).lean();
      if (!existing) return res.status(404).json({ success: false, error: "Запись не найдена" });
      const data = clean(req.body);
      await applyTranslation(data, existing, pairs);
      const item = await Model.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
      res.json({ success: true, item });
    }),
    remove: wrap(async (req, res) => {
      await Model.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    }),
    seed: wrap(async (req, res) => {
      if ((await Model.countDocuments()) > 0) {
        return res.status(409).json({ success: false, error: "Список не пуст" });
      }
      await Model.insertMany(seedItems.map((x, i) => ({ ...x, order: i })));
      res.json({ success: true });
    }),
  };
}

const testimonials = makeResource({
  Model: Testimonial,
  key: "testimonials",
  allowed: ["name", "role", "text", "rating", "roleKy", "textKy", "order", "active"],
  pairs: { text: "textKy", role: "roleKy" },
  pick: (d) => ({ id: String(d._id), name: d.name, role: d.role, text: d.text, rating: d.rating, roleKy: d.roleKy, textKy: d.textKy }),
  seedItems: [
    { name: "Айдана Карымова", role: "Frontend Developer @ TechHub", roleKy: "Frontend Developer @ TechHub",
      text: "За шесть месяцев я прошла путь от новичка до первой работы. Преподаватели — практикующие специалисты.",
      textKy: "6 айдын ичинде нөлдөн баштап биринчи жумушка чейин жол басып өттүм. Окутуучулар — иштеп жаткан адистер." },
    { name: "Жалгас Бейсенов", role: "Backend Engineer @ Startup", roleKy: "Backend Engineer @ Startup",
      text: "Это была моя лучшая инвестиция в себя. В портфолио появились реальные проекты, а рядом оказалось сильное сообщество.",
      textKy: "Өзүмө кылган эң мыкты салым. Портфолиодо чыныгы долбоорлор жана мыкты коомдоштук." },
    { name: "Мадина Токтосунова", role: "UI/UX Designer @ Agency", roleKy: "UI/UX Designer @ Agency",
      text: "Курс по дизайну дал мне все необходимые инструменты. Уже на четвёртом месяце я получила первый заказ.",
      textKy: "Дизайн программасы мага бардык куралдарды берди. 4-айда эле биринчи тапшырыкты алдым." },
  ],
});

// Кнопки «Перевести» в форме админки: POST /api/admin/translate
// { from: "ru"|"ky", to: "ky"|"ru", texts: { поле: "текст" } } -> { texts: { поле: "перевод" } }
const translate = wrap(async (req, res) => {
  const { from, to, texts } = req.body || {};
  const ok = ["ru", "ky"];
  if (!ok.includes(from) || !ok.includes(to) || from === to || !texts || typeof texts !== "object") {
    return res.status(400).json({ success: false, error: "Неверные параметры перевода" });
  }
  const fields = {};
  for (const [k, v] of Object.entries(texts).slice(0, 10)) {
    if (typeof v === "string" && v.trim() && v.length <= 3000) fields[k] = v;
  }
  const { texts: out } = await translateFields(fields, from, to);
  if (!Object.keys(out).length) {
    return res.status(502).json({ success: false, error: "Не удалось перевести. Попробуйте ещё раз или впишите перевод вручную." });
  }
  res.json({ success: true, texts: out });
});

module.exports = { testimonials, translate };