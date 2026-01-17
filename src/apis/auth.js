const express = require("express");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const jwt = require("jsonwebtoken");
const User = require("../database/User");

const router = express.Router();

// Configurazione Passport Discord Strategy
passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: process.env.DISCORD_CALLBACK_URL,
      scope: ["identify", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Cerca l'utente nel DB o crealo se non esiste
        let user = await User.findOne({ discordId: profile.id });

        if (!user) {
          user = new User({
            discordId: profile.id,
            username: profile.username,
            discriminator: profile.discriminator,
            avatar: profile.avatar,
          });
          await user.save();
        } else {
          // Aggiorna i dati se sono cambiati
          user.username = profile.username;
          user.avatar = profile.avatar;
          user.discriminator = profile.discriminator;
          await user.save();
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    },
  ),
);

// Serializzazione utente per la sessione temporanea OAuth
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) =>
  User.findById(id).then((user) => done(null, user)),
);

// Middleware per verificare il token JWT dai cookie
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.userId = decoded.id;
    next();
  });
};

// Rotta per ottenere i dati dell'utente corrente
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// 1. Rotta per iniziare il login
router.get("/discord", passport.authenticate("discord"));

// 2. Callback di Discord
router.get(
  "/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/" }),
  (req, res) => {
    // Login avvenuto con successo, generiamo il JWT
    const token = jwt.sign(
      {
        id: req.user._id,
        discordId: req.user.discordId,
        role: req.user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Salviamo il token in un cookie sicuro httpOnly
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Solo https in produzione
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 giorni
    });

    res.redirect("/"); // Torna alla home
  },
);

router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});

module.exports = router;
