const mongoose = require("mongoose");

const TournamentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  format: { type: String, enum: ["solo", "duo", "trio"], default: "solo" },
  prize: { type: String },
  image: { type: String },
  description: { type: String },
  status: {
    type: String,
    enum: ["Aperto", "In Corso", "Concluso"],
    default: "Aperto",
  },
  createdAt: { type: Date, default: Date.now },
  subscribers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  teams: [{
    captain: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    teammates: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      username: String,
      status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
    }]
  }]
});

module.exports = mongoose.model("Tournament", TournamentSchema);
