const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  discriminator: { type: String },
  avatar: { type: String },
  minecraftUsername: { type: String },
  role: { type: String, default: "utente" }, // 'utente', 'iscritto', 'developer', 'gestore', 'founder'
  socials: {
    tiktok: String,
    youtube: String,
    instagram: String,
    discord: String,
    twitch: String,
  },
  createdAt: { type: Date, default: Date.now },
  notifications: [{
    type: { type: String },
    message: String,
    data: Object,
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  notificationSettings: {
    tournamentStart: { type: Boolean, default: true },
    tournamentUpdates: { type: Boolean, default: true },
    tournamentEnd: { type: Boolean, default: true },
    newTournament: { type: Boolean, default: true }
  },
  privacySettings: {
    showBedwarsStats: { type: Boolean, default: true },
    showSocials: { type: Boolean, default: true },
    showSkills: { type: Boolean, default: true },
    showMemories: { type: Boolean, default: true },
    allowSkinDownload: { type: Boolean, default: true },
    showProfileLikes: { type: Boolean, default: false }
  },
  recentSearches: [{
    username: String,
    avatar: String,
    discordId: String,
    minecraftUsername: String,
    searchedAt: { type: Date, default: Date.now }
  }],
  profileLikes: { type: [String], default: [] },
  tournaments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tournament" }],
});

module.exports = mongoose.model("User", UserSchema);
