const mongoose = require("mongoose");

const TournamentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  prize: { type: String },
  image: { type: String },
  description: { type: String },
  status: { type: String, enum: ['Aperto', 'In Corso', 'Concluso'], default: 'Aperto' },
  createdAt: { type: Date, default: Date.now },
  subscribers: { type: Array, default: [] }
});

module.exports = mongoose.model("Tournament", TournamentSchema);