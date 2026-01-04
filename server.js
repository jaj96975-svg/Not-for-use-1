const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const { v4: uuid } = require("uuid");

const app = express();
app.use(cors());
app.use(bodyParser.json());

/* ====== CONFIG ====== */
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const API_KEY = process.env.API_KEY;
const REDIRECT_URI = process.env.REDIRECT_URI;

/* ====== OAUTH ====== */
const oauth2 = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// DEMO STORE (use DB later or it’s buns)
const sessions = {};

/* ====== AUTH ROUTES ====== */
app.get("/auth", (req, res) => {
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.force-ssl"]
  });
  res.redirect(url);
});

app.get("/oauth2callback", async (req, res) => {
  const { tokens } = await oauth2.getToken(req.query.code);
  const sessionToken = uuid();
  sessions[sessionToken] = tokens;

  res.send(`
    LOGIN SUCCESS 🔥<br><br>
    COPY THIS TOKEN INTO SCRATCH:<br>
    <b>${sessionToken}</b>
  `);
});

/* ====== HELPERS ====== */
function ytAuth(token) {
  if (!sessions[token]) throw "invalid token";
  oauth2.setCredentials(sessions[token]);
  return google.youtube({ version: "v3", auth: oauth2 });
}

const videoId = url =>
  new URL(url).searchParams.get("v");

const channelId = url =>
  url.includes("channel/")
    ? url.split("channel/")[1].split(/[/?]/)[0]
    : url.split("/").pop();

/* ====== ACTION ENDPOINTS ====== */
app.post("/like", async (req, res) => {
  await ytAuth(req.headers.authorization)
    .videos.rate({ id: videoId(req.body.url), rating: "like" });
  res.json({ ok: true });
});

app.post("/dislike", async (req, res) => {
  await ytAuth(req.headers.authorization)
    .videos.rate({ id: videoId(req.body.url), rating: "dislike" });
  res.json({ ok: true });
});

app.post("/comment", async (req, res) => {
  await ytAuth(req.headers.authorization)
    .commentThreads.insert({
      part: ["snippet"],
      requestBody: {
        snippet: {
          videoId: videoId(req.body.url),
          topLevelComment: {
            snippet: { textOriginal: req.body.text }
          }
        }
      }
    });
  res.json({ ok: true });
});

app.post("/subscribe", async (req, res) => {
  await ytAuth(req.headers.authorization)
    .subscriptions.insert({
      part: ["snippet"],
      requestBody: {
        snippet: {
          resourceId: {
            kind: "youtube#channel",
            channelId: channelId(req.body.url)
          }
        }
      }
    });
  res.json({ ok: true });
});

/* ====== STATS (PUBLIC) ====== */
app.get("/stats/video", async (req, res) => {
  const yt = google.youtube({ version: "v3" });
  const r = await yt.videos.list({
    part: ["statistics"],
    id: videoId(req.query.url),
    key: API_KEY
  });
  res.json(r.data.items[0].statistics);
});

app.get("/stats/channel", async (req, res) => {
  const yt = google.youtube({ version: "v3" });
  const r = await yt.channels.list({
    part: ["statistics"],
    id: channelId(req.query.url),
    key: API_KEY
  });
  res.json(r.data.items[0].statistics);
});

/* ====== START ====== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🔥 Backend running on port " + PORT);
});
