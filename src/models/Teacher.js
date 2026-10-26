const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
        // кыргызский вариант (автоперевод, можно править руками)
    roleKy: { type: String, trim: true, maxlength: 200, default: "" },
    experienceKy: { type: String, trim: true, maxlength: 200, default: "" },
    bioKy: { type: String, trim: true, maxlength: 2800, default: "" },
    role: { type: String, trim: true, maxlength: 120, default: "" },
    experience: { type: String, trim: true, maxlength: 120, default: "" },
    subjects: { type: [String], default: [] },
    bio: { type: String, trim: true, maxlength: 2000, default: "" },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Teacher", teacherSchema);