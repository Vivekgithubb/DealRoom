/**
 * Setup Route — Agent 1 (Strategist)
 *
 * POST /api/setup
 *
 * Input: deal_type, goal, walkaway, counterparty_context
 * Output: playbook_summary, opening_move, key_leverage[], red_lines[]
 *
 * Stores only the summary in session — not the full playbook.
 */

const express = require("express");
const router = express.Router();
const { callGemini, parseGeminiJSON } = require("../services/gemini");
const { buildSetupPrompt } = require("../services/promptBuilder");
const {
  createSession,
  getSession,
  updateSession,
} = require("../utils/sessionStore");

router.post("/", async (req, res) => {
  try {
    const { deal_type, goal, walkaway, counterparty_context, session_id } =
      req.body;

    if (!deal_type || !goal || !walkaway || !session_id) {
      return res.status(400).json({
        error: "Missing required fields: deal_type, goal, walkaway, session_id",
      });
    }

    const dealContext = { deal_type, goal, walkaway, counterparty_context };

    // Create or update session
    let session = getSession(session_id);
    if (session) {
      updateSession(session_id, { dealContext, transcript: [], whispers: [] });
      session = getSession(session_id, dealContext);
    } else {
      session = createSession(session_id, dealContext);
    }

    // Build prompt and call Gemini (Agent 1)
    const prompt = buildSetupPrompt(dealContext);
    let playbook;
    try {
      const raw = await callGemini(prompt, 500);
      playbook = parseGeminiJSON(raw);
    } catch (apiErr) {
      console.error("Gemini API or parse error:", apiErr.message);
      // Return a fallback playbook
      playbook = {
        playbook_summary:
          "Prepare your key points, know your walkaway, and maintain composure. Focus on value creation rather than pure price negotiation. Build rapport first, then discuss terms.",
        opening_move:
          "Start by establishing rapport and understanding their priorities before stating your position.",
        key_leverage: [
          "Your unique value proposition",
          "Market alternatives",
          "Time flexibility",
        ],
        red_lines: [
          "Do not go below walkaway point",
          "Do not concede on core terms without reciprocity",
        ],
      };
    }

    // Store only the summary in session
    updateSession(session_id, {
      playbookSummary: playbook.playbook_summary || "",
    });

    res.json({
      success: true,
      playbook,
      session_id,
    });
  } catch (err) {
    console.error("Setup route error:", err.message);
    res.status(500).json({
      error: "Failed to generate playbook. Please try again.",
    });
  }
});

module.exports = router;
