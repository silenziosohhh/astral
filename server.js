require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");
const path = require("path");
const jwt = require("jsonwebtoken");
const User = require("./src/database/User");

const authRoutes = require("./src/apis/auth");
const apiRoutes = require("./src/apis/api");

const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);

app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "astral_secret_key",
    resave: false,
    saveUninitialized: false,
  }),
);

app.use(passport.initialize());
app.use(passport.session());

app.get("/torneo/:id", async (req, res) => {
  const Tournament = require("./src/database/Tournament");
  try {
    const t = await Tournament.findById(req.params.id).populate({
      path: "subscribers",
      select: "username avatar discordId",
    });
    if (!t) return res.status(404).send("Torneo non trovato");
    const ogImage = `https://res.cloudinary.com/demo/image/upload/l_text:Arial_60_bold:${encodeURIComponent(t.title)},co_rgb:ffffff,g_center,y_-40/l_text:Arial_40:Partecipanti%3A%20${t.subscribers.length},co_rgb:60a5fa,g_center,y_40,w_600/v1690000000/astralcup_bg.png`;
    res.send(`
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${t.title} | Astral Cup</title>
        <meta property="og:title" content="${t.title} | Astral Cup" />
        <meta property="og:description" content="Partecipa a ${t.title} su Astral Cup! Iscritti: ${t.subscribers.length}" />
        <meta property="og:image" content="${ogImage}" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="${req.protocol}://${req.get("host")}${req.originalUrl}" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${t.title} | Astral Cup" />
        <meta name="twitter:description" content="Partecipa a ${t.title} su Astral Cup! Iscritti: ${t.subscribers.length}" />
        <meta name="twitter:image" content="${ogImage}" />
        <link rel="stylesheet" href="/styles/main.css" />
        <link rel="icon" type="image/x-icon" href="/images/astralcup-logo.png">
      </head>
      <body>
        <script>window.location.replace('/pages/torneo.html?tid=${t._id}');</script>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send("Errore caricamento torneo");
  }
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-api-key",
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use("/", authRoutes);
app.use("/auth", authRoutes);

app.use("/api", apiRoutes);

app.get("/staff", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "staff.html"));
});

app.get("/classifica", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "classifica.html"));
});

app.get("/memories", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "memories.html"));
});

app.get("/tornei", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "tornei.html"));
});

app.get("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "profile.html"));
});

app.get("/profile/:username", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "profile.html"));
});

app.get("/pages/admin.html", (req, res) => res.redirect("/admin"));

app.get("/admin", async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.redirect("/");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && ["gestore", "founder", "developer"].includes(user.role)) {
      return res.sendFile(
        path.join(__dirname, "public", "pages", "admin.html"),
      );
    }
    return res.redirect("/");
  } catch (err) {
    return res.redirect("/");
  }
});

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  console.log("New Connection", socket.id);
<<<<<<< HEAD
=======
  socket.on("join", (room) => {
    socket.join(room);
  });
>>>>>>> 568815a (Update v0.0.5)
});

app.set("io", io);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
