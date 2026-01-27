// npm i axios canvas cheerio cookie-parser dotenv express express-session git github jsonwebtoken mongoose node-fetch passport passport-discord path puppeteer-core session socket.io websocket

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");
const path = require("path");
const fs = require("fs");
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

app.get("/torneo", async (req, res) => {
  const tid = req.query.tid;
  const filePath = path.join(__dirname, "public", "pages", "torneo.html");

  if (tid) {
    const Tournament = require("./src/database/Tournament");
    try {
      const t = await Tournament.findById(tid).populate({
        path: "subscribers",
        select: "username avatar discordId",
      });
      if (t) {
        fs.readFile(filePath, "utf8", (err, data) => {
          if (err) return res.status(500).send("Errore caricamento pagina");
          
          const ogImage = `${req.protocol}://${req.get("host")}/api/tournaments/${t._id}/preview-image?v=${Date.now()}`;
          const description = t.description || `Partecipa a ${t.title} su Astral Cup! Iscritti: ${t.subscribers.length}`;
          
          let html = data.replace(/<title>.*<\/title>/, `<title>${t.title} | Astral Cup</title>`);
          const metaTags = `
            <meta property="og:title" content="${t.title} | Astral Cup" />
            <meta property="og:description" content="${description}" />
            <meta property="og:image" content="${ogImage}" />
            <meta property="og:type" content="website" />
            <meta property="og:url" content="${req.protocol}://${req.get("host")}${req.originalUrl}" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="${t.title} | Astral Cup" />
            <meta name="twitter:description" content="${description}" />
            <meta name="twitter:image" content="${ogImage}" />
          `;
          html = html.replace("</head>", `${metaTags}</head>`);
          res.send(html);
        });
        return;
      }
    } catch (err) { console.error(err); }
  }
  res.sendFile(filePath);
});

app.get("/torneo/:id", async (req, res) => {
  const { id } = req.params;
  const filePath = path.join(__dirname, "public", "pages", "torneo.html");

  fs.readFile(filePath, "utf8", async (err, data) => {
    if (err) return res.status(500).send("Errore caricamento pagina");

    const Tournament = require("./src/database/Tournament");
    try {
      const t = await Tournament.findById(id).populate({
        path: "subscribers",
        select: "username avatar discordId",
      });
      if (!t) return res.status(404).send("Torneo non trovato");

      const ogImage = `${req.protocol}://${req.get("host")}/api/tournaments/${t._id}/preview-image?v=${Date.now()}`;
      const description = t.description || `Partecipa a ${t.title} su Astral Cup! Iscritti: ${t.subscribers.length}`;
      const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

      let html = data.replace(/<title>.*<\/title>/, `<title>${t.title} | Astral Cup</title>`);
      const metaTags = `
        <meta property="og:title" content="${t.title} | Astral Cup" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${ogImage}" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="${url}" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${t.title} | Astral Cup" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${ogImage}" />
      `;
      html = html.replace("</head>", `${metaTags}</head>`);
      res.send(html);
    } catch (err) {
      res.status(500).send("Errore caricamento torneo");
    }
  });
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
  const { username } = req.params;
  const { memory: memoryId } = req.query;
  const filePath = path.join(__dirname, "public", "pages", "profile.html");

  fs.readFile(filePath, "utf8", async (err, data) => {
    if (err) return res.status(500).send("Errore caricamento pagina");

    let title = `${username} | Astral Cup`;
    let description = `Guarda il profilo di ${username} su Astral Cup!`;
    let image = `${req.protocol}://${req.get("host")}/images/astralcup-logo.png`;
    const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

    try {
      const User = require("./src/database/User");
      const usernameRegex = new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      const user = await User.findOne({ username: { $regex: usernameRegex } }).lean();

      if (user) {
        if (memoryId) {
           const Memory = require("./src/database/Memory");
           const memory = await Memory.findById(memoryId);
           if (memory) {
             title = `${memory.title} | Memory di ${user.username}`;
             description = memory.description || `Guarda questa clip epica di ${user.username}!`;
             image = `${req.protocol}://${req.get("host")}/api/memories/${memory._id}/preview-image?v=${Date.now()}`;
           }
        } else {
           title = `${user.username} | Profilo Astral Cup`;
           description = `Livello: ${user.points || 0} • Wins: ${user.wins || 0} • Kills: ${user.kills || 0}`;
           image = `${req.protocol}://${req.get("host")}/api/users/${encodeURIComponent(user.username)}/preview-image?v=${Date.now()}`;
        }
      }
    } catch (e) {
      console.error("Error generating OG tags:", e);
    }

    let html = data.replace(/<title>.*<\/title>/, `<title>${title}</title>`);
    const metaTags = `
      <meta property="og:title" content="${title}" />
      <meta property="og:description" content="${description}" />
      <meta property="og:image" content="${image}" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="${url}" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${title}" />
      <meta name="twitter:description" content="${description}" />
      <meta name="twitter:image" content="${image}" />
    `;
    html = html.replace("</head>", `${metaTags}</head>`);
    res.send(html);
  });
});

app.get("/pages/admin.html", (req, res) => res.redirect("/admin"));

app.get("/admin", async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.redirect("/");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && ["gestore", "founder", "developer", "admin"].includes(user.role)) {
      return res.sendFile(
        path.join(__dirname, "public", "pages", "admin.html"),
      );
    }
    return res.redirect("/");
  } catch (err) {
    return res.redirect("/");
  }
});

app.get("/admin/:page", async (req, res) => {
  const page = req.params.page;
  const validPages = ["classifica", "iscrizioni", "tornei", "user"];
  if (!validPages.includes(page)) return res.redirect("/admin");

  const token = req.cookies.token;
  if (!token) return res.redirect("/");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && ["gestore", "founder", "developer", "admin"].includes(user.role)) {
      return res.sendFile(
        path.join(__dirname, "public", "pages", "adminpanel", `${page}.html`),
      );
    }
    return res.redirect("/");
  } catch (err) {
    return res.redirect("/");
  }
});

app.use(express.static(path.join(__dirname, "public")));
app.use("/fontawesome", express.static(path.join(__dirname, "node_modules", "@fortawesome", "fontawesome-free")));

io.on("connection", (socket) => {
  console.log("New Connection", socket.id);
  socket.on("join", (room) => {
    socket.join(room);
  });
});

app.set("io", io);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
