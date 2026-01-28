const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const router = express.Router();
const Tournament = require("../database/Tournament");
const Memory = require("../database/Memory");
const User = require("../database/User");
const jwt = require("jsonwebtoken");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const protect = async (req, res, next) => {
  const apiKey = process.env.API_KEY || null;
  const reqApiKey = req.headers['x-api-key'];
  if (apiKey && reqApiKey === apiKey) return next();
  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (
        user &&
        ["gestore", "founder", "developer", "admin"].includes(user.role)
      ) {
        req.user = user;
        return next();
      }
    } catch (err) {}
  }
  return res.status(403).json({ message: "Accesso Negato" });
};
const ensureAuth = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Non autenticato" });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Token non valido" });
    req.user = decoded;
    next();
  });
};
const sendNotification = async (io, userId, message, type = 'system', data = null) => {
  try {
    const user = await User.findById(userId);
    if (user) {
      const notif = { type, message, data, read: false, createdAt: new Date() };
      user.notifications = user.notifications || [];
      user.notifications.push(notif);
      await user.save();
      if (io) {
        io.to(user.discordId).emit("notification", notif);
      }
    }
  } catch (e) { console.error("Notification Error:", e); }
};
const sendStatusNotification = async (io, userId, message, tournamentId) => {
  try {
    const user = await User.findById(userId);
    if (user) {
      user.notifications = user.notifications || [];
      const existing = user.notifications.find(n => 
        n.type === 'tournament_status' && 
        n.data && n.data.tournamentId && n.data.tournamentId.toString() === tournamentId.toString()
      );
      if (existing) {
        existing.message = message;
        existing.read = false;
        existing.createdAt = new Date();
      } else {
        user.notifications.push({
          type: 'tournament_status',
          message,
          data: { tournamentId, link: `/torneo?tid=${tournamentId}` },
          read: false,
          createdAt: new Date()
        });
      }
      await user.save();
      if (io) {
        const notifToSend = existing || user.notifications[user.notifications.length - 1];
        io.to(user.discordId).emit("notification", notifToSend);
      }
    }
  } catch (e) { console.error("Status Notification Error:", e); }
};
router.get("/session", async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ user: null });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ discordId: decoded.discordId }).select("discordId username avatar role");
    res.json({ user });
  } catch (err) {
    res.json({ user: null });
  }
});
router.get("/me", ensureAuth, async (req, res) => {
  try {
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    const user = await User.findOne({ discordId: req.user.discordId }).lean();
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    res.json({
      discordId: user.discordId,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      minecraftUsername: user.minecraftUsername,
      skills: user.skills || [],
      socials: user.socials || {},
      notifications: user.notifications || [],
      notificationSettings: {
        tournamentStart: true,
        tournamentUpdates: true,
        tournamentEnd: true,
        newTournament: true,
        ...(user.notificationSettings || {})
      },
      privacySettings: {
        showBedwarsStats: true,
        showSocials: true,
        showSkills: true,
        showMemories: true,
        showProfileLikes: true,
        ...(user.privacySettings || {})
      },
      allowSkinDownload: true,
      profileLikesCount: user.profileLikes ? user.profileLikes.length : 0,
      isProfileLiked: user.profileLikes ? user.profileLikes.includes(user.discordId) : false,
      isSelf: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.put("/me", ensureAuth, async (req, res) => {
  try {
    const { minecraftUsername } = req.body;
    if (!minecraftUsername || minecraftUsername.trim().length === 0) {
      return res
        .status(400)
        .json({ message: "Nickname non valido" });
    }
    const user = await User.findOne({ discordId: req.user.discordId });
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    user.minecraftUsername = minecraftUsername.trim();
    await user.save();
    req.app.get("io").emit("user:update", { userId: user._id, username: user.username });
    res.json({
      message: "Nickname aggiornato con successo",
      minecraftUsername: user.minecraftUsername,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.put("/me/skills", ensureAuth, async (req, res) => {
  try {
    const { skills } = req.body;
    if (!Array.isArray(skills))
      return res.status(400).json({ message: "Dati non validi" });
    const user = await User.findOne({ discordId: req.user.discordId });
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    user.skills = skills;
    await user.save();
    req.app.get("io").emit("user:update", { userId: user._id });
    res.json({ message: "Skills aggiornate", skills: user.skills });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.put("/me/socials", ensureAuth, async (req, res) => {
  try {
    const { tiktok, youtube, instagram, discord, twitch } = req.body;
    const user = await User.findOne({ discordId: req.user.discordId });
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    user.socials = { tiktok, youtube, instagram, discord, twitch };
    await user.save();
    req.app.get("io").emit("user:update", { userId: user._id });
    res.json({ message: "Social aggiornati", socials: user.socials });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.put("/me/notification-settings", ensureAuth, async (req, res) => {
  try {
    const { tournamentStart, tournamentUpdates, tournamentEnd, newTournament } = req.body;
    const user = await User.findOne({ discordId: req.user.discordId });
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    const current = user.notificationSettings || {};
    user.notificationSettings = {
        tournamentStart: tournamentStart !== undefined ? tournamentStart : current.tournamentStart,
        tournamentUpdates: tournamentUpdates !== undefined ? tournamentUpdates : current.tournamentUpdates,
        tournamentEnd: tournamentEnd !== undefined ? tournamentEnd : current.tournamentEnd,
        newTournament: newTournament !== undefined ? newTournament : current.newTournament
    };
    user.markModified('notificationSettings');
    await user.save();
    res.json({ message: "Impostazioni aggiornate", notificationSettings: user.notificationSettings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.put("/me/privacy-settings", ensureAuth, async (req, res) => {
  try {
    const { showBedwarsStats, showSocials, showSkills, showMemories, allowSkinDownload, showProfileLikes } = req.body;
    const user = await User.findOne({ discordId: req.user.discordId });
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    const current = user.privacySettings || {};
    user.privacySettings = {
        showBedwarsStats: showBedwarsStats !== undefined ? showBedwarsStats : current.showBedwarsStats,
        showSocials: showSocials !== undefined ? showSocials : current.showSocials,
        showSkills: showSkills !== undefined ? showSkills : current.showSkills,
        showMemories: showMemories !== undefined ? showMemories : current.showMemories,
        allowSkinDownload: allowSkinDownload !== undefined ? allowSkinDownload : current.allowSkinDownload,
        showProfileLikes: showProfileLikes !== undefined ? showProfileLikes : current.showProfileLikes
    };
    user.markModified('privacySettings');
    await user.save();
    res.json({ message: "Impostazioni privacy aggiornate", privacySettings: user.privacySettings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/me/recent-searches", ensureAuth, async (req, res) => {
  try {
    const user = await User.findOne({ discordId: req.user.discordId });
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    const recents = user.recentSearches.sort((a, b) => new Date(b.searchedAt) - new Date(a.searchedAt));
    res.json(recents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/me/recent-searches", ensureAuth, async (req, res) => {
  try {
    const { username, avatar, discordId, minecraftUsername } = req.body;
    const user = await User.findOne({ discordId: req.user.discordId });
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    user.recentSearches = user.recentSearches.filter(s => s.username !== username);
    user.recentSearches.unshift({ username, avatar, discordId, minecraftUsername, searchedAt: new Date() });
    const MAX_RECENT_SEARCHES = 10;
    if (user.recentSearches.length > MAX_RECENT_SEARCHES) {
      user.recentSearches = user.recentSearches.slice(0, MAX_RECENT_SEARCHES);
    }
    await user.save();
    res.json(user.recentSearches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.delete("/me/recent-searches", ensureAuth, async (req, res) => {
  try {
    await User.findOneAndUpdate({ discordId: req.user.discordId }, { $set: { recentSearches: [] } });
    res.json({ message: "Cronologia cancellata" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/users/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.length < 2) return res.json([]);
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { minecraftUsername: { $regex: query, $options: "i" } }
      ]
    })
      .limit(8)
      .select("username avatar discordId minecraftUsername");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/users/:username", async (req, res) => {
  try {
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    const usernameRegex = new RegExp(
      `^${req.params.username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i",
    );
    const user = await User.findOne({
      $or: [
        { username: { $regex: usernameRegex } },
        { minecraftUsername: { $regex: usernameRegex } }
      ]
    }).lean();
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    let isLiked = false;
    let isSelf = false;
    const token = req.cookies ? req.cookies.token : null;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (user.profileLikes && user.profileLikes.includes(decoded.discordId)) {
                isLiked = true;
            }
            if (decoded.discordId === user.discordId) isSelf = true;
        } catch (e) {}
    }
    const privacy = user.privacySettings || {};
    const showSocials = isSelf || privacy.showSocials !== false;
    const showSkills = isSelf || privacy.showSkills !== false;
    const showBedwarsStats = isSelf || privacy.showBedwarsStats !== false;
    const showMemories = isSelf || privacy.showMemories !== false;
    const allowSkinDownload = isSelf || privacy.allowSkinDownload !== false;
    const showProfileLikes = isSelf || privacy.showProfileLikes !== false;
    res.json({
      username: user.username,
      avatar: user.avatar,
      discordId: user.discordId,
      role: user.role,
      minecraftUsername: user.minecraftUsername,
      wins: user.wins,
      kills: user.kills,
      points: user.points,
      skills: showSkills ? (user.skills || []) : [],
      socials: showSocials ? (user.socials || {}) : {},
      profileLikesCount: showProfileLikes ? (user.profileLikes ? user.profileLikes.length : 0) : null,
      isProfileLiked: isLiked,
      showBedwarsStats,
      showSocials,
      showSkills,
      showMemories,
      allowSkinDownload,
      showProfileLikes,
      isSelf
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/users/:username/preview-image", async (req, res) => {
  try {
    const { username } = req.params;
    const usernameRegex = new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const user = await User.findOne({
      $or: [
        { username: { $regex: usernameRegex } },
        { minecraftUsername: { $regex: usernameRegex } }
      ]
    }).lean();
    if (!user) return res.status(404).send("User not found");
    let Canvas;
    try {
        Canvas = require('canvas');
    } catch (e) {
        console.error("Canvas non installato. Esegui: npm install canvas");
        return res.status(500).send("Server configuration error: Canvas missing");
    }
    const width = 1200;
    const height = 630;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const templatePath = path.join(__dirname, '../../public/images/link-embed-image.png');
    try {
        const background = await Canvas.loadImage(templatePath);
        ctx.drawImage(background, 0, 0, width, height);
    } catch (e) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
    }
    let avatarUrl = "https://cdn.discordapp.com/embed/avatars/0.png";
    if (user.avatar) {
        avatarUrl = `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`;
    }
    try {
        const avatar = await Canvas.loadImage(avatarUrl);
        const avatarSize = 300;
        const avatarX = 80;
        const avatarY = (height - avatarSize) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
        ctx.lineWidth = 12;
        ctx.strokeStyle = '#3b82f6';
        ctx.stroke();
    } catch (e) { console.error("Errore avatar canvas:", e); }
    const textX = 450;
    let textY = 200;
    const role = (user.role || "Utente").toUpperCase();
    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = '#60a5fa';
    ctx.fillText(role, textX, textY);
    textY += 90;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 100px sans-serif';
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 20;
    ctx.fillText(user.username, textX, textY);
    textY += 70;
    ctx.shadowBlur = 0;
    ctx.font = '45px sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`Level: ${user.points || 0}  •  Wins: ${user.wins || 0}`, textX, textY);
    textY += 60;
    if (user.minecraftUsername) {
        ctx.font = 'italic 35px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`IGN: ${user.minecraftUsername}`, textX, textY);
    }
    const buffer = canvas.toBuffer('image/png');
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating image");
  }
});
router.get("/tournaments/:id/preview-image", async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).send("Tournament not found");
    let Canvas;
    try { Canvas = require('canvas'); } catch (e) { return res.status(500).send("Canvas missing"); }
    const width = 1200;
    const height = 630;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const templatePath = path.join(__dirname, '../../public/images/link-embed-image.png');
    try {
        const background = await Canvas.loadImage(templatePath);
        ctx.drawImage(background, 0, 0, width, height);
    } catch (e) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
    }
    if (tournament.image) {
        try {
            const img = await Canvas.loadImage(tournament.image);
            const imgSize = 300;
            const imgX = 80;
            const imgY = (height - imgSize) / 2;
            ctx.save();
            ctx.beginPath();
            ctx.arc(imgX + imgSize / 2, imgY + imgSize / 2, imgSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            const scale = Math.max(imgSize / img.width, imgSize / img.height);
            const x = imgX + (imgSize - img.width * scale) / 2;
            const y = imgY + (imgSize - img.height * scale) / 2;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            ctx.restore();
            ctx.beginPath();
            ctx.arc(imgX + imgSize / 2, imgY + imgSize / 2, imgSize / 2, 0, Math.PI * 2, true);
            ctx.lineWidth = 12;
            ctx.strokeStyle = '#3b82f6';
            ctx.stroke();
        } catch (e) {}
    }
    const textX = 450;
    let textY = 200;
    const status = (tournament.status || "Aperto").toUpperCase();
    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = '#60a5fa';
    if (status === 'IN CORSO') ctx.fillStyle = '#f87171';
    if (status === 'CONCLUSO') ctx.fillStyle = '#94a3b8';
    ctx.fillText(status, textX, textY);
    textY += 90;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px sans-serif';
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 20;
    let title = tournament.title;
    if (title.length > 18) title = title.substring(0, 18) + "...";
    ctx.fillText(title, textX, textY);
    textY += 70;
    ctx.shadowBlur = 0;
    ctx.font = '45px sans-serif';
    ctx.fillStyle = '#e2e8f0';
    const dateStr = new Date(tournament.date).toLocaleDateString('it-IT');
    const format = (tournament.format || "SOLO").toUpperCase();
    ctx.fillText(`${dateStr}  •  ${format}`, textX, textY);
    textY += 60;
    ctx.font = 'italic 35px sans-serif';
    ctx.fillStyle = '#94a3b8';
    const count = tournament.subscribers ? tournament.subscribers.length : 0;
    const label = (tournament.format === 'duo' || tournament.format === 'trio') && tournament.teams ? `${tournament.teams.length} Teams` : `${count} Iscritti`;
    ctx.fillText(label, textX, textY);
    const buffer = canvas.toBuffer('image/png');
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    res.status(500).send("Error generating image");
  }
});
router.get("/memories/:id/preview-image", async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).send("Memory not found");
    const user = await User.findOne({ discordId: memory.authorId });
    const authorName = user ? user.username : "Utente";
    let Canvas;
    try { Canvas = require('canvas'); } catch (e) { return res.status(500).send("Canvas missing"); }
    const width = 1200;
    const height = 630;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    let imgUrl = memory.image || memory.videoUrl;
    if (imgUrl.includes("youtube") || imgUrl.includes("youtu.be")) {
        const match = imgUrl.match(/[?&]v=([^&#]+)/) || imgUrl.match(/youtu\.be\/([^?&#]+)/);
        if (match && match[1]) imgUrl = `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
    }
    try {
        const bg = await Canvas.loadImage(imgUrl);
        const scale = Math.max(width / bg.width, height / bg.height);
        const x = (width / 2) - (bg.width / 2) * scale;
        const y = (height / 2) - (bg.height / 2) * scale;
        ctx.drawImage(bg, x, y, bg.width * scale, bg.height * scale);
    } catch (e) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, width, height);
    }
    const gradient = ctx.createLinearGradient(0, height / 2, 0, height);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.shadowColor = "rgba(0,0,0,1)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 70px sans-serif';
    const title = memory.title.length > 30 ? memory.title.substring(0, 30) + "..." : memory.title;
    ctx.fillText(title, 50, 520);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '40px sans-serif';
    ctx.fillText(`Memory di ${authorName}`, 50, 580);
    const buffer = canvas.toBuffer('image/png');
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    res.status(500).send("Error generating image");
  }
});
router.post("/users/:username/like", ensureAuth, async (req, res) => {
  try {
    const usernameRegex = new RegExp(
      `^${req.params.username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i",
    );
    const user = await User.findOne({
      $or: [
        { username: { $regex: usernameRegex } },
        { minecraftUsername: { $regex: usernameRegex } }
      ]
    }).lean();
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    let profileLikes = user.profileLikes || [];
    const likerId = req.user.discordId;
    const index = profileLikes.indexOf(likerId);
    let liked = false;
    if (index === -1) {
      await User.collection.updateOne({ _id: user._id }, { $addToSet: { profileLikes: likerId } });
      profileLikes.push(likerId);
      liked = true;
      if (likerId !== user.discordId) {
         const liker = await User.findOne({ discordId: likerId }).lean();
         const likerName = liker ? liker.username : "Un utente";
         await sendNotification(req.app.get("io"), user._id, `A ${likerName} piace il tuo profilo`, 'info', { link: `/profile/${likerName}` });
      }
    } else {
      await User.collection.updateOne({ _id: user._id }, { $pull: { profileLikes: likerId } });
      profileLikes = profileLikes.filter(id => id !== likerId);
    }
    req.app.get("io").emit("profile:update", {
      username: user.username,
      profileLikesCount: profileLikes.length
    });
    res.json({ liked, count: profileLikes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/users/:username/likes", ensureAuth, async (req, res) => {
  try {
    const usernameRegex = new RegExp(
      `^${req.params.username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i",
    );
    const user = await User.findOne({
      $or: [
        { username: { $regex: usernameRegex } },
        { minecraftUsername: { $regex: usernameRegex } }
      ]
    }).lean();
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    if (user.discordId !== req.user.discordId) {
      return res.status(403).json({ message: "Non autorizzato" });
    }
    const likers = await User.find({ discordId: { $in: (user.profileLikes || []) } })
      .select("username avatar discordId")
      .lean();
    res.json(likers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/users/:username/memories", async (req, res) => {
  try {
    const usernameRegex = new RegExp(
      `^${req.params.username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i",
    );
    const user = await User.findOne({
      $or: [
        { username: { $regex: usernameRegex } },
        { minecraftUsername: { $regex: usernameRegex } }
      ]
    });
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    let isSelf = false;
    const token = req.cookies.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.discordId === user.discordId) isSelf = true;
        } catch (e) {}
    }
    const privacy = user.privacySettings || {};
    if (!isSelf && privacy.showMemories === false) return res.json([]);
    const memories = await Memory.find({ authorId: user.discordId }).sort({
      createdAt: -1,
    });
    res.json(memories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/proxy/spacevalley/:username", async (req, res) => {
  try {
    const response = await fetch(`https://api.spacevalley.eu/bedwars/users/${req.params.username}/stats`);
    if (!response.ok) return res.status(response.status).json({ error: "Errore API SpaceValley" });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/tournaments", async (req, res) => {
  try {
    const tournaments = await Tournament.find()
      .sort({ date: 1 })
      .populate({
        path: "subscribers",
        select: "username avatar discordId minecraftUsername",
      })
      .populate({
        path: "teams.captain",
        select: "username avatar discordId minecraftUsername",
      })
      .populate({
        path: "teams.teammates.userId",
        select: "username avatar discordId minecraftUsername",
      });
    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/tournaments", protect, async (req, res) => {
  try {
    const tournament = new Tournament(req.body);
    await tournament.save();
    const notif = {
      _id: new mongoose.Types.ObjectId(),
      type: 'system',
      message: `🏆 Nuovo torneo pubblicato: ${tournament.title}!`,
      read: false,
      createdAt: new Date(),
      data: { link: `/torneo?tid=${tournament._id}` }
    };
    await User.collection.updateMany({
      $or: [
        { "notificationSettings.newTournament": true },
        { "notificationSettings.newTournament": { $exists: false } }
      ]
    }, { $push: { notifications: notif } });
    req.app
      .get("io")
      .emit("tournaments:update", { type: "create", tournament });
    res.json(tournament);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.put("/tournaments/:id", protect, async (req, res) => {
  try {
    const { status, ...updateData } = req.body;
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: "Torneo non trovato" });
    const oldStatus = tournament.status;
    if (Object.keys(updateData).length > 0) {
        Object.assign(tournament, updateData);
    }
    if (status && status !== oldStatus) {
      tournament.status = status;
      if (status === "In Corso") {
        if (tournament.format !== 'solo' && tournament.teams && tournament.teams.length > 0) {
          const validTeams = [];
          const removedTeams = [];
          for (const team of tournament.teams) {
            const allAccepted = team.teammates.every(m => m.status === 'accepted');
            let isComplete = true;
            if (tournament.format === 'duo' && team.teammates.length < 1) isComplete = false;
            if (tournament.format === 'trio' && team.teammates.length < 2) isComplete = false;
            if (allAccepted && isComplete) {
              validTeams.push(team);
            } else {
              removedTeams.push(team);
            }
          }
          tournament.teams = validTeams;
          for (const team of removedTeams) {
            tournament.subscribers = tournament.subscribers.filter(s => s.toString() !== team.captain.toString());
            await sendNotification(req.app.get("io"), team.captain, `Il tuo team è stato escluso dal torneo ${tournament.title} perché incompleto.`, 'system', { link: `/torneo?tid=${tournament._id}` });
            for (const mate of team.teammates) {
              if (mate.userId) {
                tournament.subscribers = tournament.subscribers.filter(s => s.toString() !== mate.userId.toString());
                await sendNotification(req.app.get("io"), mate.userId, `Il team per il torneo ${tournament.title} è stato escluso perché incompleto.`, 'system', { link: `/torneo?tid=${tournament._id}` });
              }
            }
          }
        }
        const subscribers = await User.find({ _id: { $in: tournament.subscribers } });
        for (const sub of subscribers) {
          const settings = sub.notificationSettings || { tournamentStart: true };
          if (settings.tournamentStart) {
            await sendStatusNotification(req.app.get("io"), sub._id, `Il torneo ${tournament.title} è iniziato!`, tournament._id);
          }
        }
      }
      else if (status === "Concluso") {
        const subscribers = await User.find({ _id: { $in: tournament.subscribers } });
        for (const sub of subscribers) {
          const settings = sub.notificationSettings || { tournamentEnd: true };
          if (settings.tournamentEnd) {
            await sendStatusNotification(req.app.get("io"), sub._id, `Il torneo ${tournament.title} è terminato.`, tournament._id);
          }
        }
      }
      else if (status === "Pausa") {
        const subscribers = await User.find({ _id: { $in: tournament.subscribers } });
        for (const sub of subscribers) {
          const settings = sub.notificationSettings || { tournamentUpdates: true };
          if (settings.tournamentUpdates) {
            await sendStatusNotification(req.app.get("io"), sub._id, `Il torneo ${tournament.title} è in pausa.`, tournament._id);
          }
        }
      }
      else if (status === "Aperto") {
        const subscribers = await User.find({ _id: { $in: tournament.subscribers } });
        for (const sub of subscribers) {
          const settings = sub.notificationSettings || { tournamentUpdates: true };
          if (settings.tournamentUpdates) {
            await sendStatusNotification(req.app.get("io"), sub._id, `Il torneo ${tournament.title} è stato riaperto.`, tournament._id);
          }
        }
      }
    }
    await tournament.save();
    req.app.get("io").emit("tournaments:update", { type: "update", action: "status_change", tournament });
    res.json(tournament);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.delete("/tournaments/:id", protect, async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndDelete(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: "Torneo non trovato" });
    }
    req.app.get("io").emit("tournaments:update", {
      type: "delete",
      tournamentId: req.params.id,
    });
    res.json({ message: "Torneo eliminato" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/tournaments/:id/join", ensureAuth, async (req, res) => {
  try {
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      const rawTournament = await Tournament.collection.findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
      if (rawTournament && rawTournament.teams) {
        let needsMigration = false;
        const newTeams = rawTournament.teams.map(team => {
          if (team.teammates && team.teammates.length > 0 && typeof team.teammates[0] === 'string') {
            needsMigration = true;
            return {
              ...team,
              teammates: team.teammates.map(name => ({ username: name, status: 'accepted' }))
            };
          }
          return team;
        });
        if (needsMigration) {
          await Tournament.collection.updateOne(
            { _id: new mongoose.Types.ObjectId(req.params.id) },
            { $set: { teams: newTeams } }
          );
        }
      }
    }
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament)
      return res.status(404).json({ message: "Torneo non trovato" });
    if (tournament.status !== "Aperto") {
      return res.status(400).json({ message: "Le iscrizioni sono chiuse" });
    }
    const user = await User.findOne({ discordId: req.user.discordId });
    if (!user) {
      return res.status(404).json({ message: "Utente non trovato" });
    }
    if (!user.minecraftUsername) {
      return res.status(400).json({
        message:
          "Devi impostare il tuo nickname di Minecraft nel profilo per iscriverti.",
      });
    }
    const isSubscribed = tournament.subscribers.some(
      (sub) => sub.toString() === user._id.toString(),
    );
    if (isSubscribed) {
      return res
        .status(400)
        .json({ message: "Sei già iscritto a questo torneo" });
    }
    if (tournament.teams && tournament.teams.length > 0) {
      const isInTeam = tournament.teams.some(t => 
        t.captain.toString() === user._id.toString() || 
        t.teammates.some(m => m.userId && m.userId.toString() === user._id.toString())
      );
      if (isInTeam) return res.status(400).json({ message: "Sei già in un team per questo torneo" });
    }
    const { teammates } = req.body;
    if (tournament.format === "duo") {
      if (
        !Array.isArray(teammates) ||
        teammates.length !== 1 ||
        !teammates[0]
      ) {
        return res
          .status(400)
          .json({ message: "Devi inserire il nickname del tuo compagno." });
      }
    } else if (tournament.format === "trio") {
      if (
        !Array.isArray(teammates) ||
        teammates.length !== 2 ||
        !teammates[0] ||
        !teammates[1]
      ) {
        return res
          .status(400)
          .json({ message: "Devi inserire i nickname dei tuoi 2 compagni." });
      }
    }
    if (teammates && teammates.length > 0) {
      const unique = new Set(teammates);
      if (unique.size !== teammates.length) {
        return res
          .status(400)
          .json({ message: "Hai inserito lo stesso compagno più volte." });
      }
      if (teammates.includes(user.username)) {
        return res
          .status(400)
          .json({ message: "Non puoi inserire te stesso come compagno." });
      }
      const foundUsers = await User.find({ username: { $in: teammates } });
      if (foundUsers.length !== teammates.length) {
        return res.status(400).json({
          message: "Uno o più compagni non sono registrati sul sito.",
        });
      }
      for (const tUser of foundUsers) {
        if (!tUser.minecraftUsername) {
          return res.status(400).json({
            message: `Il compagno ${tUser.username} non ha impostato il nickname di Minecraft.`,
          });
        }
        const isCaptain = tournament.subscribers.some(
          (sub) => sub.toString() === tUser._id.toString(),
        );
        if (isCaptain) {
          return res.status(400).json({
            message: `${tUser.username} è già iscritto a questo torneo.`,
          });
        }
        if (tournament.teams) {
          const isInTeam = tournament.teams.some((t) =>
            t.teammates.some(mate => (mate.username || mate) === tUser.username)
          );
          if (isInTeam) {
            return res
              .status(400)
              .json({ message: `${tUser.username} è già in un team.` });
          }
        }
      }
    }
    const teamMembers = [];
    if (teammates && teammates.length > 0) {
      const foundUsers = await User.find({ username: { $in: teammates } });
      for (const tUser of foundUsers) {
        teamMembers.push({
          userId: tUser._id,
          username: tUser.username,
          status: 'pending'
        });
        tUser.notifications = tUser.notifications || [];
        const notif = {
          type: 'tournament_invite',
          message: `${user.username} ti ha invitato al torneo ${tournament.title}`,
          data: {
            tournamentId: tournament._id,
            captainName: user.username
          },
          read: false,
          createdAt: new Date()
        };
        tUser.notifications.push(notif);
        req.app.get("io").to(tUser.discordId).emit("notification", notif);
        await tUser.save();
      }
    }
    if (tournament.format === "solo") {
      tournament.subscribers.push(user._id);
    }
    if (tournament.format !== "solo") {
      tournament.teams.push({
        captain: user._id,
        teammates: teamMembers,
      });
    }
    await tournament.save();
    if (
      !user.tournaments.some(
        (tid) => tid.toString() === tournament._id.toString(),
      )
    ) {
      user.tournaments.push(tournament._id);
      await user.save();
    }
    req.app.get("io").emit("subscriptions:update", {
      type: "join",
      tournamentId: tournament._id,
      userId: user._id,
    });
    res.json({ message: "Iscrizione effettuata con successo", tournament });
  } catch (err) {
    console.error("Errore iscrizione torneo:", err);
    res.status(500).json({ error: err.message });
  }
});
router.get("/notifications", ensureAuth, async (req, res) => {
  try {
    const user = await User.findOne({ discordId: req.user.discordId });
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    const notifs = user.notifications ? user.notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/notifications/read-all", ensureAuth, async (req, res) => {
  try {
    const user = await User.findOne({ discordId: req.user.discordId });
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    let updated = false;
    if (user.notifications && user.notifications.length > 0) {
      user.notifications.forEach(n => {
        if (!n.read) {
          n.read = true;
          updated = true;
        }
      });
      if (updated) {
        user.markModified('notifications');
        await user.save();
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/notifications/:id/read", ensureAuth, async (req, res) => {
  try {
    const user = await User.findOne({ discordId: req.user.discordId });
    const notif = user.notifications.id(req.params.id);
    if (notif) {
      notif.read = true;
      await user.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/notifications/:id/respond", ensureAuth, async (req, res) => {
  try {
    const { action } = req.body;
    const user = await User.findOne({ discordId: req.user.discordId });
    const notif = user.notifications.id(req.params.id);
    if (!notif || notif.type !== 'tournament_invite') {
      return res.status(404).json({ message: "Invito non trovato" });
    }
    const tournament = await Tournament.findById(notif.data.tournamentId);
    if (!tournament) return res.status(404).json({ message: "Torneo non trovato o cancellato" });
    let captainId = null;
    if (tournament.teams) {
      for (const team of tournament.teams) {
        const memberIndex = team.teammates.findIndex(m => (m.username === user.username) || (m.userId && m.userId.toString() === user._id.toString()));
        if (memberIndex !== -1) {
          captainId = team.captain;
          if (action === 'accept') {
            team.teammates[memberIndex].status = 'accepted';
            if (!user.tournaments.some(t => t.toString() === tournament._id.toString())) {
              user.tournaments.push(tournament._id);
            }
          } else {
            team.teammates[memberIndex].status = 'rejected';
          }
          break;
        }
      }
    }
    notif.read = true;
    if (!notif.data) notif.data = {};
    notif.data.response = action;
    user.markModified('notifications');
    if (action !== 'accept' && captainId) {
        if (tournament.format === 'duo') {
            tournament.teams = tournament.teams.filter(t => t.captain.toString() !== captainId.toString());
            const captainUser = await User.findById(captainId);
            if (captainUser) {
                captainUser.tournaments = captainUser.tournaments.filter(tid => tid.toString() !== tournament._id.toString());
                await captainUser.save();
                await sendNotification(req.app.get("io"), captainId, `Il tuo team è stato sciolto perché ${user.username} ha rifiutato l'invito.`, 'error', { link: `/torneo?tid=${tournament._id}` });
            }
        } else if (tournament.format === 'trio') {
            const team = tournament.teams.find(t => t.captain.toString() === captainId.toString());
            if (team) {
                team.teammates = team.teammates.filter(m => (m.userId && m.userId.toString() !== user._id.toString()) && m.username !== user.username);
                await sendNotification(req.app.get("io"), captainId, `${user.username} ha rifiutato l'invito al torneo ${tournament.title}.`, 'warning', { link: `/torneo?tid=${tournament._id}` });
            }
        }
    }
    await tournament.save();
    await user.save();
    if (captainId && action === 'accept') {
      const msg = `${user.username} ha ${action === 'accept' ? 'accettato' : 'rifiutato'} il tuo invito per il torneo ${tournament.title}`;
      await sendNotification(req.app.get("io"), captainId, msg, 'info', { link: `/torneo?tid=${tournament._id}` });
    }
    req.app.get("io").emit("tournaments:update", { type: "update", tournament });
    res.json({ message: `Invito ${action === 'accept' ? 'accettato' : 'rifiutato'}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/tournaments/:id/unsubscribe", ensureAuth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: "Torneo non trovato" });
    }
    const user = await User.findOne({ discordId: req.user.discordId });
    if (!user) {
      return res.status(404).json({ message: "Utente non trovato" });
    }
    tournament.subscribers = tournament.subscribers.filter(
      (sub) => sub.toString() !== user._id.toString(),
    );
    user.tournaments = user.tournaments.filter(
      (tid) => tid.toString() !== tournament._id.toString(),
    );
    await user.save();
    if (tournament.teams) {
      const teamIndex = tournament.teams.findIndex(t => t.captain.toString() === user._id.toString());
      if (teamIndex !== -1) {
        const team = tournament.teams[teamIndex];
        if (team.teammates && team.teammates.length > 0) {
          for (const mate of team.teammates) {
            if (mate.userId) {
              const mateUser = await User.findById(mate.userId);
              if (mateUser) {
                mateUser.notifications = mateUser.notifications.filter(n => {
                   if (n.type === 'tournament_invite' && n.data && n.data.tournamentId) {
                     return n.data.tournamentId.toString() !== tournament._id.toString();
                   }
                   return true;
                });
                mateUser.tournaments = mateUser.tournaments.filter(tid => tid.toString() !== tournament._id.toString());
                await mateUser.save();
                req.app.get("io").to(mateUser.discordId).emit("notification", { silent: true });
                await sendNotification(req.app.get("io"), mateUser._id, `Il team per il torneo ${tournament.title} è stato sciolto perché il capitano si è disiscritto.`, 'error');
              }
            }
          }
        }
        tournament.teams.splice(teamIndex, 1);
      } else {
        const teamMemberIndex = tournament.teams.findIndex(t => t.teammates.some(m => m.userId && m.userId.toString() === user._id.toString()));
        if (teamMemberIndex !== -1) {
            const team = tournament.teams[teamMemberIndex];
            if (tournament.format === 'duo') {
                const captainUser = await User.findById(team.captain);
                if (captainUser) {
                    captainUser.tournaments = captainUser.tournaments.filter(tid => tid.toString() !== tournament._id.toString());
                    await captainUser.save();
                    await sendNotification(req.app.get("io"), team.captain, `Il team per il torneo ${tournament.title} è stato sciolto perché il tuo compagno si è disiscritto.`, 'error');
                }
                tournament.teams.splice(teamMemberIndex, 1);
            } else {
                team.teammates = team.teammates.filter(m => m.userId && m.userId.toString() !== user._id.toString());
                await sendNotification(req.app.get("io"), team.captain, `${user.username} ha lasciato il team per il torneo ${tournament.title}.`, 'info');
            }
        }
      }
    }
    await tournament.save();
    req.app.get("io").emit("subscriptions:update", {
      type: "leave",
      tournamentId: tournament._id,
      userId: user._id,
    });
    res.json({ message: "Disiscrizione avvenuta con successo" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.delete("/tournaments/:id/kick/:userId", protect, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: "Torneo non trovato" });
    const targetUserId = req.params.userId;
    const user = await User.findById(targetUserId);
    tournament.subscribers = tournament.subscribers.filter(
      (sub) => sub.toString() !== targetUserId.toString(),
    );
    if (user) {
        user.tournaments = user.tournaments.filter(
          (tid) => tid.toString() !== tournament._id.toString(),
        );
        await user.save();
        await sendNotification(req.app.get("io"), user._id, `Sei stato rimosso dal torneo ${tournament.title} da un amministratore.`, 'error');
    }
    if (tournament.teams) {
      const teamIndex = tournament.teams.findIndex(t => t.captain.toString() === targetUserId.toString());
      if (teamIndex !== -1) {
        const team = tournament.teams[teamIndex];
        if (team.teammates && team.teammates.length > 0) {
          for (const mate of team.teammates) {
            if (mate.userId) {
              const mateUser = await User.findById(mate.userId);
              if (mateUser) {
                mateUser.tournaments = mateUser.tournaments.filter(tid => tid.toString() !== tournament._id.toString());
                await mateUser.save();
                await sendNotification(req.app.get("io"), mateUser._id, `Il team per il torneo ${tournament.title} è stato sciolto da un amministratore.`, 'error');
                tournament.subscribers = tournament.subscribers.filter(s => s.toString() !== mateUser._id.toString());
              }
            }
          }
        }
        tournament.teams.splice(teamIndex, 1);
      } else {
        const teamMemberIndex = tournament.teams.findIndex(t => t.teammates.some(m => m.userId && m.userId.toString() === targetUserId.toString()));
        if (teamMemberIndex !== -1) {
            const team = tournament.teams[teamMemberIndex];
            if (tournament.format === 'duo') {
                const captainUser = await User.findById(team.captain);
                if (captainUser) {
                    captainUser.tournaments = captainUser.tournaments.filter(tid => tid.toString() !== tournament._id.toString());
                    await captainUser.save();
                    await sendNotification(req.app.get("io"), team.captain, `Il team per il torneo ${tournament.title} è stato sciolto perché un membro è stato espulso.`, 'error');
                    tournament.subscribers = tournament.subscribers.filter(s => s.toString() !== team.captain.toString());
                }
                tournament.teams.splice(teamMemberIndex, 1);
            } else {
                team.teammates = team.teammates.filter(m => m.userId && m.userId.toString() !== targetUserId.toString());
                await sendNotification(req.app.get("io"), team.captain, `Un membro del tuo team è stato espulso dal torneo ${tournament.title}.`, 'warning');
            }
        }
      }
    }
    await tournament.save();
    req.app.get("io").emit("subscriptions:update", { type: "leave", tournamentId: tournament._id });
    res.json({ message: "Utente espulso con successo" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/memories", async (req, res) => {
  try {
    const memories = await Memory.find().sort({ createdAt: -1 }).lean();
    const authorIds = [...new Set(memories.map((m) => m.authorId))];
    const users = await User.find({ discordId: { $in: authorIds } }).select(
      "discordId username avatar",
    );
    const memoriesWithAuthor = memories.map((m) => {
      const author = users.find((u) => u.discordId === m.authorId);
      return {
        ...m,
        authorName: author ? author.username : "Utente",
      };
    });
    res.json(memoriesWithAuthor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/memories", ensureAuth, async (req, res) => {
  try {
    const { title, videoUrl, description, image } = req.body;
    if (!title || !videoUrl) {
      return res.status(400).json({ message: "Titolo e URL sono obbligatori" });
    }
    if (description && description.length > 200) {
      return res
        .status(400)
        .json({ message: "La descrizione non può superare i 200 caratteri" });
    }
    try {
      new URL(videoUrl);
    } catch (_) {
      return res.status(400).json({ message: "URL non valido" });
    }
    const memory = new Memory({
      title,
      videoUrl,
      image,
      description,
      authorId: req.user.discordId,
    });
    await memory.save();
    req.app.get("io").emit("memory:update", { type: "create", memory });
    res.json(memory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/my-memories", ensureAuth, async (req, res) => {
  try {
    const memories = await Memory.find({ authorId: req.user.discordId }).sort({
      createdAt: -1,
    });
    res.json(memories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.delete("/memories/:id", ensureAuth, async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).json({ message: "Memory non trovata" });
    if (
      memory.authorId !== req.user.discordId &&
      !["gestore", "founder", "admin"].includes(req.user.role)
    )
      return res.status(403).json({ message: "Non autorizzato" });
    await Memory.findByIdAndDelete(req.params.id);
    req.app.get("io").emit("memory:update", { type: "delete", id: req.params.id });
    res.json({ message: "Memory eliminata" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/memories/:id/like", ensureAuth, async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).json({ message: "Memory non trovata" });
    if (!memory.likes) memory.likes = [];
    const userId = req.user.discordId;
    const index = memory.likes.indexOf(userId);
    if (index === -1) {
      memory.likes.push(userId);
    } else {
      memory.likes.splice(index, 1);
    }
    await memory.save();
    req.app.get("io").emit("memory:update", {
      id: memory._id,
      likes: memory.likes.length,
      shares: (memory.shares || []).length,
    });
    res.json({ likes: memory.likes.length, isLiked: index === -1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/memories/:id/share", ensureAuth, async (req, res) => {
  try {
    const memory = await Memory.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { shares: req.user.discordId } },
      { new: true },
    );
    if (!memory) return res.status(404).json({ message: "Memory non trovata" });
    req.app.get("io").emit("memory:update", {
      id: memory._id,
      likes: (memory.likes || []).length,
      shares: (memory.shares || []).length,
    });
    res.json({ shares: (memory.shares || []).length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/leaderboard", async (req, res) => {
  try {
    const users = await User.find({ points: { $gt: 0 } })
      .sort({ points: -1 })
      .limit(50);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.put("/leaderboard/:username", protect, async (req, res) => {
  try {
    const { wins, kills, bedBroken, points } = req.body;
    const user = await User.findOneAndUpdate(
      { username: req.params.username },
      { $set: { wins, kills, bedBroken, points } },
      { new: true },
    );
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    req.app.get("io").emit("leaderboard:update", { username: req.params.username });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/staff", async (req, res) => {
  const staffConfig = [
    {
      id: "772719324208168973",
      role: "GESTORE CUP",
      roleColor: "#ec0606",
      description: "<b>Gestore</b> ufficiale della <b>CUP</b>",
      icon: "fas fa-trophy",
    },
    {
      id: "1357100230247579699",
      role: "FOUNDER",
      roleColor: "#8b5cf6",
      description: "<b>Fondatore</b> ufficiale della <b>CUP</b>",
      icon: "fas fa-crown",
    },
    {
      id: "1220788267427823810",
      role: "GESTORE CUP",
      roleColor: "#ec0606",
      description: "<b>Gestore</b> ufficiale della <b>CUP</b>",
      icon: "fas fa-trophy",
    },
  ];
  try {
    const staffIds = staffConfig.map((s) => s.id);
    const users = await User.find({ discordId: { $in: staffIds } });
    const staffData = staffConfig.map((config) => {
      const user = users.find((u) => u.discordId === config.id);
      return {
        ...config,
        username: user ? user.username : "Utente non registrato",
        avatar: user ? user.avatar : null,
        discordId: config.id,
      };
    });
    res.json(staffData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/download/bedwars-rules", (req, res) => {
  const filePath = path.join(__dirname, "../../public/pages/policies/assets/ASTRALCUP-Regolamento_Generale_Bedwars.pdf");
  res.download(filePath);
});
module.exports = router;
