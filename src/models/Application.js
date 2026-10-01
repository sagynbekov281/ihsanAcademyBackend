const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    course: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    language: {
      type: String,
      enum: ["ru", "ky"],
      default: "ru",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    managerNotified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", applicationSchema);