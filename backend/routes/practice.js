const express = require("express");
const router = express.Router();
const { getSession, updateSession, ensureSession } = require("../utils/sessionStore");
const { generateFirstMove, generateResponse } = require("../services/practiceAgent");

/**
 * POST /api/practice/start
 * Initialize a practice session
 */
router.post("/start", async (req, res) => {
  const { session_id, deal_type, goal, walkaway } = req.body;

  if (!session_id) return res.status(400).json({ error: "Missing session_id" });

  const dealContext = {
    deal_type: deal_type || "General Negotiation",
    goal: goal || "Best possible outcome",
    walkaway: walkaway || "No agreement",
  };

  // Create/Update session
  updateSession(session_id, { 
    dealContext, 
    practiceTranscript: [],
    practiceTurns: 0 
  });

  const session = getSession(session_id);

  try {
    const aiText = await generateFirstMove(dealContext);
    
    // Add to transcript
    const turn = { speaker: "them", text: aiText, timestamp: Date.now() };
    session.practiceTranscript.push(turn);
    session.practiceTurns += 1;

    res.json({ success: true, ai_text: aiText, session_id });
  } catch (err) {
    console.error("[PracticeRoute] Start failed:", err.message);
    res.status(500).json({ error: "Failed to start simulation." });
  }
});

/**
 * POST /api/practice/respond
 * Handle user message and get AI response
 */
router.post("/respond", async (req, res) => {
  const { session_id, user_message } = req.body;

  if (!session_id || !user_message) {
    return res.status(400).json({ error: "Missing session_id or user_message" });
  }

  const session = getSession(session_id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  // Add user turn
  session.practiceTranscript.push({ 
    speaker: "me", 
    text: user_message, 
    timestamp: Date.now() 
  });

  try {
    const aiText = await generateResponse({
      ...session.dealContext,
      transcript: session.practiceTranscript
    });

    const turn = { speaker: "them", text: aiText, timestamp: Date.now() };
    session.practiceTranscript.push(turn);
    session.practiceTurns += 1;

    res.json({ 
      success: true, 
      ai_text: aiText, 
      turn_count: session.practiceTurns 
    });
  } catch (err) {
    console.error("[PracticeRoute] Respond failed:", err.message);
    res.status(500).json({ error: "Simulator error." });
  }
});

module.exports = router;
