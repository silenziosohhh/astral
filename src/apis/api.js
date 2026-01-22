const express = require("express");
const router = express.Router();
const Tournament = require("../database/Tournament");
const Memory = require("../database/Memory");
const User = require("../database/User");
const jwt = require("jsonwebtoken");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

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
      minecraftUsername: user.minecraftUsername,
      skills: user.skills || [],
      socials: user.socials || {},
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/me", ensureAuth, async (req, res) => {
  try {
    const { minecraftUsername } = req.body;
    if (!minecraftUsername || minecraftUsername.trim().length < 3) {
      return res
        .status(400)
        .json({ message: "Nickname non valido (min 3 caratteri)" });
    }
    const user = await User.findOne({ discordId: req.user.discordId });
    if (!user) return res.status(404).json({ message: "Utente non trovato" });

    user.minecraftUsername = minecraftUsername.trim();
    await user.save();
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
    res.json({ message: "Social aggiornati", socials: user.socials });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/users/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.length < 2) return res.json([]);
    const users = await User.find({
      username: { $regex: query, $options: "i" },
    })
      .limit(5)
      .select("username avatar discordId minecraftUsername");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/users/:username", async (req, res) => {
  try {
    const usernameRegex = new RegExp(
      `^${req.params.username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i",
    );
    const user = await User.findOne({ username: { $regex: usernameRegex } });
    if (!user) return res.status(404).json({ message: "Utente non trovato" });

    res.json({
      username: user.username,
      avatar: user.avatar,
      discordId: user.discordId,
      role: user.role,
      minecraftUsername: user.minecraftUsername,
      wins: user.wins,
      kills: user.kills,
      points: user.points,
      skills: user.skills || [],
      socials: user.socials || {},
    });
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
    const user = await User.findOne({ username: { $regex: usernameRegex } });
    if (!user) return res.status(404).json({ message: "Utente non trovato" });

    const memories = await Memory.find({ authorId: user.discordId }).sort({
      createdAt: -1,
    });
    res.json(memories);
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
        select: "username avatar discordId",
      })
      .populate({
        path: "teams.captain",
        select: "username avatar discordId",
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

    req.app
      .get("io")
      .emit("tournaments:update", { type: "create", tournament });
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
            t.teammates.includes(tUser.username),
          );
          if (isInTeam) {
            return res
              .status(400)
              .json({ message: `${tUser.username} è già in un team.` });
          }
        }
      }
    }

    tournament.subscribers.push(user._id);
    if (tournament.format !== "solo") {
      tournament.teams.push({
        captain: user._id,
        teammates: teammates || [],
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

    const before = tournament.subscribers.length;
    tournament.subscribers = tournament.subscribers.filter(
      (sub) => sub.toString() !== user._id.toString(),
    );

    if (tournament.subscribers.length === before) {
      return res
        .status(400)
        .json({ message: "Non sei iscritto a questo torneo" });
    }

    if (tournament.teams) {
      tournament.teams = tournament.teams.filter(
        (t) => t.captain.toString() !== user._id.toString(),
      );
    }

    await tournament.save();

    user.tournaments = user.tournaments.filter(
      (tid) => tid.toString() !== tournament._id.toString(),
    );
    await user.save();

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

router.post("/memories/:id/like", ensureAuth, async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).json({ message: "Memory non trovata" });

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
      shares: memory.shares,
    });

    res.json({ likes: memory.likes.length, isLiked: index === -1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/memories/:id/share", async (req, res) => {
  try {
    const memory = await Memory.findByIdAndUpdate(
      req.params.id,
      { $inc: { shares: 1 } },
      { new: true },
    );
    if (!memory) return res.status(404).json({ message: "Memory non trovata" });

    req.app.get("io").emit("memory:update", {
      id: memory._id,
      likes: memory.likes.length,
      shares: memory.shares,
    });

    res.json({ shares: memory.shares });
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

router.get("/proxy/coralmc/:username", async (req, res) => {
  try {
    const { username } = req.params;

    // UUID Mojang
    let uuid = null;
    try {
      const uuidRes = await fetch(`https://api.ashcon.app/mojang/v2/user/${username}`);
      if (uuidRes.ok) {
        const uuidData = await uuidRes.json();
        uuid = uuidData.uuid;
      }
    } catch (e) {
      console.warn(`UUID non trovato per ${username}: ${e.message}`);
    }

    // Fetch HTML della pagina CoralMC
    const response = await fetch(`https://coralmc.it/it/stats/player/${username}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (response.status === 404) {
      return res.status(404).json({ exists: false, message: "Player non trovato" });
    }

    const html = await response.text();

    // Funzione per estrarre le stats dall'HTML
    const getStat = (labels, htmlContent) => {
      for (const label of labels) {
        const safeLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regexes = [
          new RegExp(`>\\s*${safeLabel}\\s*<[\\s\\S]*?>\\s*([\\d\\.]+)\\s*<`, "i"),
          new RegExp(`${safeLabel}\\s*:\\s*([\\d\\.]+)`, "i"),
          new RegExp(`${safeLabel}[^\\d]*?([\\d\\.]+)`, "i"),
        ];
        for (const regex of regexes) {
          const match = htmlContent.match(regex);
          if (match && match[1]) return parseInt(match[1].replace(/\./g, "").trim());
        }
      }
      return null;
    };

    // Prova a leggere le stats dall'HTML
    let stats = {
      wins: getStat(["Vittorie", "Wins"], html),
      kills: getStat(["Uccisioni", "Kills"], html),
      deaths: getStat(["Morti", "Deaths"], html),
      beds: getStat(["Letti rotti", "Letti distrutti", "Beds broken"], html),
      finals: getStat(["Final kills", "Uccisioni finali", "Finali"], html),
      finalDeaths: getStat(["Morti finali", "Final deaths"], html),
      games: getStat(["Partite giocate", "Games played", "Partite"], html),
      level: getStat(["Livello", "Level"], html),
    };

    // Se HTML non ha trovato nulla → fallback API JSON
    const allNull = Object.values(stats).every((v) => v === null);
    if (allNull) {
      try {
        const jsonResponse = await fetch(`https://coralmc.it/api/player/${username}`, {
          headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        });

        if (jsonResponse.ok) {
          const data = await jsonResponse.json();
          stats = {
            wins: data.stats?.wins ?? 0,
            kills: data.stats?.kills ?? 0,
            deaths: data.stats?.deaths ?? 0,
            beds: data.stats?.bedsBroken ?? 0,
            finals: data.stats?.finalKills ?? 0,
            finalDeaths: data.stats?.finalDeaths ?? 0,
            games: data.stats?.gamesPlayed ?? 0,
            level: data.level ?? 0,
          };
          console.log(`Stats di ${username} caricate dal fallback API JSON`);
        } else {
          console.warn(`API JSON CoralMC fallita per ${username}, status: ${jsonResponse.status}`);
        }
      } catch (e) {
        console.error(`Errore fallback API JSON per ${username}:`, e.message);
      }
    } else {
      console.log(`Stats di ${username} caricate dall'HTML`);
    }

    // Normalizza eventuali null a 0
    for (const key in stats) {
      if (stats[key] === null || stats[key] === undefined) stats[key] = 0;
    }

    res.json({
      uuid,
      username,
      exists: true,
      stats,
    });

  } catch (err) {
    console.error(`Errore endpoint CoralMC per ${req.params.username}:`, err);
    res.status(500).json({ exists: false, error: err.message });
  }
});

module.exports = router;
