const express = require("express");
const router = express.Router();
const Tournament = require("../database/Tournament");
const Memory = require("../database/Memory");
const User = require("../database/User");
const jwt = require("jsonwebtoken");

const protect = async (req, res, next) => {
  const apiKey = process.env.API_KEY || null;

  if (apiKey && apiKey !== null) return next();

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

router.get("/me", ensureAuth, async (req, res) => {
  try {
    const user = await User.findOne({ discordId: req.user.discordId });
    if (!user) return res.status(404).json({ message: "Utente non trovato" });

    res.json({
      discordId: user.discordId,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/tournaments", async (req, res) => {
  try {
    const tournaments = await Tournament.find().sort({ date: 1 });
    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/tournaments", protect, async (req, res) => {
  try {
    const tournament = new Tournament(req.body);
    await tournament.save();
    res.json(tournament);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/tournaments/:id/join", ensureAuth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament)
      return res.status(404).json({ message: "Torneo non trovato" });

    if (tournament.status !== "Aperto") {
      return res.status(400).json({ message: "Le iscrizioni sono chiuse" });
    }

    const isSubscribed = tournament.subscribers.some(
      (sub) => sub.discordId === req.user.discordId,
    );
    if (isSubscribed) {
      return res
        .status(400)
        .json({ message: "Sei già iscritto a questo torneo" });
    }

    tournament.subscribers.push({
      discordId: req.user.discordId,
      username: req.user.username,
      avatar: req.user.avatar,
      joinedAt: new Date(),
    });

    await tournament.save();
    res.json({ message: "Iscrizione effettuata con successo", tournament });
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

    const before = tournament.subscribers.length;

    tournament.subscribers = tournament.subscribers.filter(
      (sub) => sub.discordId !== req.user.discordId,
    );

    if (tournament.subscribers.length === before) {
      return res
        .status(400)
        .json({ message: "Non sei iscritto a questo torneo" });
    }

    await tournament.save();
    res.json({ message: "Disiscrizione avvenuta con successo" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/memories", async (req, res) => {
  try {
    const memories = await Memory.find().sort({ createdAt: -1 });
    res.json(memories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/memories", ensureAuth, async (req, res) => {
  try {
    const { title, videoUrl, description } = req.body;

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
      description,

      authorId: req.user.discordId,
    });
    await memory.save();
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
    res.json({ message: "Memory eliminata" });
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
      icon: "fas fa-gamepad",
    },
    {
      id: "1357100230247579699",
      role: "FOUNDER",
      roleColor: "#8b5cf6",
      description: "<b>Fondatore</b> ufficiale della <b>CUP</b>",
      icon: "fas fa-trophy",
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

module.exports = router;
