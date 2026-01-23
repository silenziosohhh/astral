const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Tournament = require("../database/Tournament");
const Memory = require("../database/Memory");
const User = require("../database/User");
const jwt = require("jsonwebtoken");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const coralCache = new Map();
const CORAL_CACHE_TTL = 10 * 60 * 1000; // 10 minuti

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
      notifications: user.notifications || [],
      notificationSettings: user.notificationSettings || {
        tournamentStart: true,
        tournamentUpdates: true,
        tournamentEnd: true
      }
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
    const { tournamentStart, tournamentUpdates, tournamentEnd } = req.body;
    const user = await User.findOne({ discordId: req.user.discordId });
    if (!user) return res.status(404).json({ message: "Utente non trovato" });

    user.notificationSettings = { tournamentStart, tournamentUpdates, tournamentEnd };
    await user.save();
    res.json({ message: "Impostazioni aggiornate", notificationSettings: user.notificationSettings });
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
    
    if (user.recentSearches.length > 5) {
      user.recentSearches = user.recentSearches.slice(0, 5);
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
        select: "username avatar discordId minecraftUsername",
      })
      .populate({
        path: "teams.captain",
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

    // Crea la notifica per tutti gli utenti nel database
    const notif = {
      _id: new mongoose.Types.ObjectId(),
      type: 'system',
      message: `🏆 Nuovo torneo pubblicato: ${tournament.title}!`,
      read: false,
      createdAt: new Date(),
      data: { link: `/torneo?tid=${tournament._id}` }
    };
    await User.collection.updateMany({}, { $push: { notifications: notif } });

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
    
    // Update fields
    if (Object.keys(updateData).length > 0) {
        Object.assign(tournament, updateData);
    }

    if (status && status !== oldStatus) {
      tournament.status = status;

      // LOGICA INIZIO TORNEO
      if (status === "In Corso") {
        // 1. Escludi team incompleti
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

          // Notifica ed elimina team rimossi
          for (const team of removedTeams) {
            // Rimuovi capitano
            tournament.subscribers = tournament.subscribers.filter(s => s.toString() !== team.captain.toString());
            await sendNotification(req.app.get("io"), team.captain, `Il tuo team è stato escluso dal torneo ${tournament.title} perché incompleto.`, 'system', { link: `/torneo?tid=${tournament._id}` });

            // Rimuovi e notifica compagni
            for (const mate of team.teammates) {
              if (mate.userId) {
                tournament.subscribers = tournament.subscribers.filter(s => s.toString() !== mate.userId.toString());
                await sendNotification(req.app.get("io"), mate.userId, `Il team per il torneo ${tournament.title} è stato escluso perché incompleto.`, 'system', { link: `/torneo?tid=${tournament._id}` });
              }
            }
          }
        }

        // 2. Notifica Inizio a tutti gli iscritti rimasti
        const subscribers = await User.find({ _id: { $in: tournament.subscribers } });
        for (const sub of subscribers) {
          const settings = sub.notificationSettings || { tournamentStart: true };
          if (settings.tournamentStart) {
            await sendNotification(req.app.get("io"), sub._id, `Il torneo ${tournament.title} è iniziato!`, 'info', { link: `/torneo?tid=${tournament._id}` });
          }
        }
      }
      // LOGICA FINE TORNEO
      else if (status === "Concluso") {
        const subscribers = await User.find({ _id: { $in: tournament.subscribers } });
        for (const sub of subscribers) {
          const settings = sub.notificationSettings || { tournamentEnd: true };
          if (settings.tournamentEnd) {
            await sendNotification(req.app.get("io"), sub._id, `Il torneo ${tournament.title} è terminato.`, 'info', { link: `/torneo?tid=${tournament._id}` });
          }
        }
      }
      // LOGICA SOSPENSIONE TORNEO
      else if (status === "Pausa") {
        const subscribers = await User.find({ _id: { $in: tournament.subscribers } });
        for (const sub of subscribers) {
          const settings = sub.notificationSettings || { tournamentUpdates: true };
          if (settings.tournamentUpdates) {
            await sendNotification(req.app.get("io"), sub._id, `Il torneo ${tournament.title} è in pausa.`, 'warning', { link: `/torneo?tid=${tournament._id}` });
          }
        }
      }
    }

    await tournament.save();
    
    // Emetti evento socket per aggiornare i client in tempo reale
    req.app.get("io").emit("tournaments:update", { type: "update", tournament });
    
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
    // AUTO-MIGRATION: Corregge automaticamente i vecchi team con array di stringhe
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      const rawTournament = await Tournament.collection.findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
      if (rawTournament && rawTournament.teams) {
        let needsMigration = false;
        const newTeams = rawTournament.teams.map(team => {
          // Se teammates è un array di stringhe, convertilo in oggetti
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

    // Check if already in a team (captain or member)
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

    // Prepare teammates data with status
    const teamMembers = [];
    if (teammates && teammates.length > 0) {
      const foundUsers = await User.find({ username: { $in: teammates } });
      
      for (const tUser of foundUsers) {
        teamMembers.push({
          userId: tUser._id,
          username: tUser.username,
          status: 'pending' // Default status
        });

        // Send Notification
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
        teammates: teamMembers, // Now storing objects with status
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

// Gestione Notifiche
router.get("/notifications", ensureAuth, async (req, res) => {
  try {
    const user = await User.findOne({ discordId: req.user.discordId });
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    
    // Sort by newest
    const notifs = user.notifications ? user.notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
    res.json(notifs);
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
    const { action } = req.body; // 'accept' or 'decline'
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
            // Add tournament to user profile
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

    notif.read = true; // Mark as read after response
    if (!notif.data) notif.data = {};
    notif.data.response = action;
    user.markModified('notifications');

    if (action !== 'accept' && captainId) {
        if (tournament.format === 'duo') {
            // 2v2: Sciogli il team
            tournament.teams = tournament.teams.filter(t => t.captain.toString() !== captainId.toString());
            
            const captainUser = await User.findById(captainId);
            if (captainUser) {
                captainUser.tournaments = captainUser.tournaments.filter(tid => tid.toString() !== tournament._id.toString());
                await captainUser.save();
                await sendNotification(req.app.get("io"), captainId, `Il tuo team è stato sciolto perché ${user.username} ha rifiutato l'invito.`, 'error', { link: `/torneo?tid=${tournament._id}` });
            }
        } else if (tournament.format === 'trio') {
            // 3v3: Rimuovi utente, team in sospeso
            const team = tournament.teams.find(t => t.captain.toString() === captainId.toString());
            if (team) {
                team.teammates = team.teammates.filter(m => (m.userId && m.userId.toString() !== user._id.toString()) && m.username !== user.username);
                await sendNotification(req.app.get("io"), captainId, `${user.username} ha rifiutato l'invito al torneo ${tournament.title}.`, 'warning', { link: `/torneo?tid=${tournament._id}` });
            }
        }
    }

    await tournament.save();
    await user.save();

    // Notifica il capitano della decisione
    if (captainId && action === 'accept') {
      const msg = `${user.username} ha ${action === 'accept' ? 'accettato' : 'rifiutato'} il tuo invito per il torneo ${tournament.title}`;
      await sendNotification(req.app.get("io"), captainId, msg, 'info', { link: `/torneo?tid=${tournament._id}` });
    }

    // Aggiorna in tempo reale la pagina del torneo per tutti
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

    // Rimuovi l'utente dalla lista iscritti principale
    tournament.subscribers = tournament.subscribers.filter(
      (sub) => sub.toString() !== user._id.toString(),
    );

    // Rimuovi il torneo dal profilo utente
    user.tournaments = user.tournaments.filter(
      (tid) => tid.toString() !== tournament._id.toString(),
    );
    await user.save();

    // Gestione Team: se l'utente è capitano, sciogli il team e pulisci i compagni
    if (tournament.teams) {
      const teamIndex = tournament.teams.findIndex(t => t.captain.toString() === user._id.toString());
      
      if (teamIndex !== -1) {
        const team = tournament.teams[teamIndex];
        
        // Pulisci i compagni (rimuovi notifiche e iscrizioni pendenti)
        if (team.teammates && team.teammates.length > 0) {
          for (const mate of team.teammates) {
            if (mate.userId) {
              const mateUser = await User.findById(mate.userId);
              if (mateUser) {
                // 1. Rimuovi notifica invito specifica per questo torneo
                mateUser.notifications = mateUser.notifications.filter(n => {
                   if (n.type === 'tournament_invite' && n.data && n.data.tournamentId) {
                     return n.data.tournamentId.toString() !== tournament._id.toString();
                   }
                   return true;
                });

                // 2. Rimuovi torneo dal profilo compagno (se aveva già accettato)
                mateUser.tournaments = mateUser.tournaments.filter(tid => tid.toString() !== tournament._id.toString());
                await mateUser.save();

                // 3. Aggiorna client compagno (rimuove notifica visivamente)
                req.app.get("io").to(mateUser.discordId).emit("notification", { silent: true });
                
                // Notifica scioglimento
                await sendNotification(req.app.get("io"), mateUser._id, `Il team per il torneo ${tournament.title} è stato sciolto perché il capitano si è disiscritto.`, 'error');
              }
            }
          }
        }
        // Rimuovi il team
        tournament.teams.splice(teamIndex, 1);
      } else {
        // Se l'utente non è capitano, rimuovilo da eventuali team come membro
        const teamMemberIndex = tournament.teams.findIndex(t => t.teammates.some(m => m.userId && m.userId.toString() === user._id.toString()));
        
        if (teamMemberIndex !== -1) {
            const team = tournament.teams[teamMemberIndex];
            
            if (tournament.format === 'duo') {
                // 2v2: Se un membro esce, il team viene sciolto (rimuovi anche capitano)
                const captainUser = await User.findById(team.captain);
                if (captainUser) {
                    captainUser.tournaments = captainUser.tournaments.filter(tid => tid.toString() !== tournament._id.toString());
                    await captainUser.save();
                    await sendNotification(req.app.get("io"), team.captain, `Il team per il torneo ${tournament.title} è stato sciolto perché il tuo compagno si è disiscritto.`, 'error');
                }
                tournament.teams.splice(teamMemberIndex, 1);
            } else {
                // 3v3: Se un membro esce, il team rimane ma incompleto
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
    
    // Rimuovi l'utente dalla lista iscritti principale
    tournament.subscribers = tournament.subscribers.filter(
      (sub) => sub.toString() !== targetUserId.toString(),
    );

    // Rimuovi il torneo dal profilo utente (se esiste)
    if (user) {
        user.tournaments = user.tournaments.filter(
          (tid) => tid.toString() !== tournament._id.toString(),
        );
        await user.save();
        await sendNotification(req.app.get("io"), user._id, `Sei stato rimosso dal torneo ${tournament.title} da un amministratore.`, 'error');
    }

    // Gestione Team
    if (tournament.teams) {
      const teamIndex = tournament.teams.findIndex(t => t.captain.toString() === targetUserId.toString());
      
      if (teamIndex !== -1) {
        // L'utente è un capitano: sciogli il team
        const team = tournament.teams[teamIndex];
        
        if (team.teammates && team.teammates.length > 0) {
          for (const mate of team.teammates) {
            if (mate.userId) {
              const mateUser = await User.findById(mate.userId);
              if (mateUser) {
                // Rimuovi torneo dal profilo compagno
                mateUser.tournaments = mateUser.tournaments.filter(tid => tid.toString() !== tournament._id.toString());
                await mateUser.save();
                
                // Notifica scioglimento
                await sendNotification(req.app.get("io"), mateUser._id, `Il team per il torneo ${tournament.title} è stato sciolto da un amministratore.`, 'error');
                
                // Rimuovi anche dalla lista subscribers globale se presente
                tournament.subscribers = tournament.subscribers.filter(s => s.toString() !== mateUser._id.toString());
              }
            }
          }
        }
        tournament.teams.splice(teamIndex, 1);
      } else {
        // L'utente potrebbe essere un membro
        const teamMemberIndex = tournament.teams.findIndex(t => t.teammates.some(m => m.userId && m.userId.toString() === targetUserId.toString()));
        
        if (teamMemberIndex !== -1) {
            const team = tournament.teams[teamMemberIndex];
            
            if (tournament.format === 'duo') {
                // 2v2: Se rimuovi un membro, sciogli il team
                const captainUser = await User.findById(team.captain);
                if (captainUser) {
                    captainUser.tournaments = captainUser.tournaments.filter(tid => tid.toString() !== tournament._id.toString());
                    await captainUser.save();
                    await sendNotification(req.app.get("io"), team.captain, `Il team per il torneo ${tournament.title} è stato sciolto perché un membro è stato espulso.`, 'error');
                    
                    // Rimuovi capitano da subscribers
                    tournament.subscribers = tournament.subscribers.filter(s => s.toString() !== team.captain.toString());
                }
                tournament.teams.splice(teamMemberIndex, 1);
            } else {
                // 3v3: Rimuovi solo il membro
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

router.get("/proxy/coralmc/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const cacheKey = username.toLowerCase();
    if (coralCache.has(cacheKey)) {
      const { data, timestamp } = coralCache.get(cacheKey);
      if (Date.now() - timestamp < CORAL_CACHE_TTL) {
        return res.json(data);
      }
    }

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

    // Funzione per estrarre le stats dall'HTML con parser migliorato
    const getStat = (labels, htmlContent, targetClassPart = null) => {
      for (const label of labels) {
        const safeLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        
        let regexes = [];

        if (targetClassPart) {
          // Cerca Label ... <tag class="...targetClassPart...">Value</tag>
          // Usa una parte unica della classe per matchare (es. "font-mono")
          regexes.push(new RegExp(`>\\s*${safeLabel}\\s*<[\\s\\S]{0,800}?(?:class=["'][^"']*${targetClassPart}[^"']*["'])[^>]*>\\s*([\\d.,]+)\\s*<`, "i"));
          regexes.push(new RegExp(`${safeLabel}[\\s\\S]{0,800}?(?:class=["'][^"']*${targetClassPart}[^"']*["'])[^>]*>\\s*([\\d.,]+)\\s*<`, "i"));
        }

        // Fallback patterns
        regexes.push(new RegExp(`>\\s*${safeLabel}\\s*<[\\s\\S]{0,400}?>\\s*([\\d.,]+)\\s*<`, "i"));
        regexes.push(new RegExp(`${safeLabel}\\s*[:]?\\s*([\\d.,]+)`, "i"));

        for (const regex of regexes) {
          const match = htmlContent.match(regex);
          if (match && match[1]) {
            let val = match[1].replace(/[.,]/g, "").trim();
            return parseInt(val) || 0;
          }
        }
      }
      return 0;
    };

    // Prova a leggere le stats dall'HTML
    const mainStatClass = "font-mono"; // Parte unica della classe per stats principali
    const levelClass = "text-3xl";     // Parte unica per il livello
    const winLossClass = "text-sm";    // Parte unica per wins/losses

    let stats = {
      wins: getStat(["Wins", "Vittorie"], html, winLossClass),
      losses: getStat(["Losses", "Sconfitte"], html, winLossClass),
      kills: getStat(["Uccisioni", "Kills"], html, mainStatClass),
      deaths: getStat(["Morti", "Deaths"], html, mainStatClass),
      beds: getStat(["Letti rotti", "Letti distrutti", "Beds broken"], html, mainStatClass),
      finals: getStat(["Final kills", "Uccisioni finali", "Finali"], html, mainStatClass),
      finalDeaths: getStat(["Morti finali", "Final deaths"], html),
      games: getStat(["Partite giocate", "Games played", "Partite"], html),
      level: getStat(["Livello Bedwars", "Level", "Livello"], html, levelClass),
      winstreak: getStat(["Winstreak", "Serie", "Serie attuale", "Current Winstreak", "Streak", "Vittorie consecutive"], html, mainStatClass),
      topWinstreak: getStat(["Top Winstreak", "Highest Winstreak", "Winstreak migliore", "Best Winstreak", "Miglior serie", "Max Winstreak", "Best Streak", "Record serie"], html, mainStatClass),
      coins: getStat(["Monete", "Coins", "Denaro", "Soldi", "Bilancio"], html, mainStatClass)
    };

    // Se HTML non ha trovato nulla → fallback API JSON
    const allZero = Object.values(stats).every((v) => v === 0);
    if (allZero) {
      try {
        const jsonResponse = await fetch(`https://coralmc.it/api/player/${username}`, {
          headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        });

        if (jsonResponse.ok) {
          const data = await jsonResponse.json();
          stats = {
            wins: data.bedwars?.stats?.wins ?? data.wins ?? 0,
            losses: data.bedwars?.stats?.losses ?? data.losses ?? 0,
            kills: data.bedwars?.stats?.kills ?? data.kills ?? 0,
            deaths: data.bedwars?.stats?.deaths ?? data.deaths ?? 0,
            beds: data.bedwars?.stats?.bedsBroken ?? data.bedsBroken ?? 0,
            finals: data.bedwars?.stats?.finalKills ?? data.finalKills ?? 0,
            finalDeaths: data.bedwars?.stats?.finalDeaths ?? data.finalDeaths ?? 0,
            games: data.bedwars?.stats?.gamesPlayed ?? data.gamesPlayed ?? 0,
            level: data.bedwars?.level ?? data.level ?? 0,
            winstreak: data.bedwars?.stats?.winstreak ?? data.winstreak ?? 0,
            topWinstreak: data.bedwars?.stats?.highestWinstreak ?? data.highestWinstreak ?? 0,
            coins: data.coins ?? 0
          };
          console.log(`Stats di ${username} caricate dal fallback API JSON`);
          console.log(`Dati grezzi JSON:`, JSON.stringify(data, null, 2));
        } else {
          console.warn(`API JSON CoralMC fallita per ${username}, status: ${jsonResponse.status}`);
        }
      } catch (e) {
        console.error(`Errore fallback API JSON per ${username}:`, e.message);
      }
    } else {
      console.log(`Stats di ${username} caricate dall'HTML`);
    }

    // Normalizza eventuali valori non numerici a 0
    for (const key in stats) {
      stats[key] = parseInt(stats[key]) || 0;
    }

    // Calcola i ratios
    const kdr = stats.deaths > 0 ? parseFloat((stats.kills / stats.deaths).toFixed(2)) : stats.kills;
    const losses = stats.losses > 0 ? stats.losses : ((stats.games || 0) - (stats.wins || 0));
    const wlr = losses > 0 ? parseFloat((stats.wins / losses).toFixed(2)) : stats.wins;
    const fkdr = (stats.finalDeaths || 0) > 0 ? parseFloat((stats.finals / stats.finalDeaths).toFixed(2)) : stats.finals;

    const responseData = {
      uuid,
      username,
      exists: true,
      kills: stats.kills,
      deaths: stats.deaths,
      wins: stats.wins,
      losses: stats.losses,
      beds: stats.beds,
      finals: stats.finals,
      finalDeaths: stats.finalDeaths,
      games: stats.games,
      level: stats.level,
      winstreak: stats.winstreak,
      topWinstreak: stats.topWinstreak,
      coins: stats.coins,
      kdr,
      wlr,
      fkdr,
    };

    coralCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
    res.json(responseData);

  } catch (err) {
    console.error(`Errore endpoint CoralMC per ${req.params.username}:`, err);
    res.status(500).json({ exists: false, error: err.message });
  }
});

module.exports = router;
