/**
 * DealRoom Backend Server
 *
 * Express + Socket.io init
 *
 * REST routes: setup, report, simulate (one-shot calls)
 * Socket.io: whisper engine (real-time, per "Them" turn)
 */

require("dotenv").config();
const path = require("path");

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const cors = require("cors");
const { handleWhisperTurn } = require("./sockets/whisperSocket");
const { initGemini } = require("./services/gemini");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",")
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: allowedOrigins,
  }),
);
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "frontend/dist")));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});
app.get("*", (req, res) => {
  res.sendFile(path.join(process.cwd(), "frontend/dist/index.html"));
});

// REST routes (setup + report + simulate are one-shot, REST is fine for these)
app.use("/api/setup", require("./routes/setup"));
app.use("/api/report", require("./routes/report"));
app.use("/api/simulate", require("./routes/simulate"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/practice", require("./routes/practice"));

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Core real-time loop — Agent 2 (Whisperer)
  socket.on("turn:them", (data) => {
    handleWhisperTurn(socket, data, io);
  });

  // Allow client to add "me" turns to session transcript
  socket.on("turn:me", (data) => {
    const { getSession } = require("./utils/sessionStore");
    const { text, session_id } = data;
    if (!text || !session_id) return;

    const session = getSession(session_id);
    if (session) {
      session.transcript.push({
        speaker: "me",
        text,
        timestamp: Date.now(),
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Initialize Gemini on startup
initGemini();

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`\n🏢 DealRoom Backend running on port ${PORT}`);
  console.log(`   REST API:   http://localhost:${PORT}/api`);
  console.log(`   Socket.io:  ws://localhost:${PORT}`);
  console.log(
    `   Client URL: ${process.env.CLIENT_URL || "http://localhost:5174"}\n`,
  );
});
