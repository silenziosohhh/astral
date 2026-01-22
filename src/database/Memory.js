const mongoose = require("mongoose");

const MemorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  videoUrl: { type: String },
  description: { type: String },
  authorId: { type: String },
  likes: [{ type: String }],
  shares: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Memory", MemorySchema);
