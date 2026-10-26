const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, trim: true, maxlength: 160, default: "" },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    // кыргызский вариант (заполняется автопереводом, можно править руками)
    roleKy: { type: String, trim: true, maxlength: 200, default: "" },
    textKy: { type: String, trim: true, maxlength: 2600, default: "" },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Testimonial", testimonialSchema);