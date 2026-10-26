const mongoose = require("mongoose");

const teamMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, trim: true, maxlength: 160, default: "" },
    experience: { type: String, trim: true, maxlength: 200, default: "" },
    roleKy: { type: String, trim: true, maxlength: 200, default: "" },
    experienceKy: { type: String, trim: true, maxlength: 260, default: "" },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeamMember", teamMemberSchema);