const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    about: { type: String, trim: true, maxlength: 3000, default: "" },
    duration: { type: String, trim: true, maxlength: 60, default: "" },
    levelKey: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
    iconKey: { type: String, default: "code" },
    price: { type: Number, required: true, min: 0, default: 0 },
    discountPercent: { type: Number, min: 0, max: 100, default: 0 },
    discountEndsAt: { type: Date, default: null },
    topics: { type: [String], default: [] },
    langs: { type: [String], default: [] },
    students: { type: Number, default: 0 },
    projects: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);