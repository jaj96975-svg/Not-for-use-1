const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { google } = require("googleapis");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// OAUTH CLIENT USING ENV VARS
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

global.oauthTokens = null;

// AUTH ROUTES
app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.force-ssl"],
    prompt: "consent"
  });
  res.redirect(url);
});

app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("No code received");
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    global.oauthTokens = tokens;
    res.send("Auth success 🔥 Close tab and return to Scratch");
  } catch { res.status(500).send("Auth failed"); }
});

// LIKE / DISLIKE / COMMENT / SUBSCRIBE / UNSUBSCRIBE
app.post("/like", async (req, res) => { const { videoId } = req.body; try { oauth2Client.setCredentials(global.oauthTokens); await google.youtube({version:"v3",auth:oauth2Client}).videos.rate({id:videoId,rating:"like"}); res.json({success:true}); } catch { res.status(500).json({error:"Like failed"}); }});
app.post("/dislike", async (req, res) => { const { videoId } = req.body; try { oauth2Client.setCredentials(global.oauthTokens); await google.youtube({version:"v3",auth:oauth2Client}).videos.rate({id:videoId,rating:"none"}); res.json({success:true}); } catch { res.status(500).json({error:"Dislike failed"}); }});
app.post("/comment", async (req,res)=>{const{videoId,comment}=req.body;try{oauth2Client.setCredentials(global.oauthTokens);const r=await google.youtube({version:"v3",auth:oauth2Client}).commentThreads.insert({part:"snippet",requestBody:{snippet:{videoId,topLevelComment:{snippet:{textOriginal:comment}}}}});res.json({success:true,commentId:r.data.id});}catch{res.status(500).json({error:"Comment failed"});}});
app.post("/editComment", async (req,res)=>{const{commentId,newText}=req.body;try{oauth2Client.setCredentials(global.oauthTokens);await google.youtube({version:"v3",auth:oauth2Client}).comments.update({part:"snippet",requestBody:{id:commentId,snippet:{textOriginal:newText}}});res.json({success:true});}catch{res.status(500).json({error:"Edit comment failed"});}});
app.post("/removeComment", async (req,res)=>{const{commentId}=req.body;try{oauth2Client.setCredentials(global.oauthTokens);await google.youtube({version:"v3",auth:oauth2Client}).comments.delete({id:commentId});res.json({success:true});}catch{res.status(500).json({error:"Remove comment failed"});}});
app.post("/subscribe", async (req,res)=>{const{channelId}=req.body;try{oauth2Client.setCredentials(global.oauthTokens);const r=await google.youtube({version:"v3",auth:oauth2Client}).subscriptions.insert({part:"snippet",requestBody:{snippet:{resourceId:{kind:"youtube#channel",channelId}}}});res.json({success:true,subscriptionId:r.data.id});}catch{res.status(500).json({error:"Subscribe failed"});}});
app.post("/unsubscribe", async (req,res)=>{const{subscriptionId}=req.body;try{oauth2Client.setCredentials(global.oauthTokens);await google.youtube({version:"v3",auth:oauth2Client}).subscriptions.delete({id:subscriptionId});res.json({success:true});}catch{res.status(500).json({error:"Unsubscribe failed"});}});

app.listen(PORT,()=>console.log(`🔥 Backend running on port ${PORT}`));
