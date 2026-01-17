const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  discriminator: { type: String },
  avatar: { type: String },
  role: { type: String, default: "user" }, // 'admin', 'user'
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);
