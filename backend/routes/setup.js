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
  ensureSession,
} = require("../utils/sessionStore");

router.post("/", async (req, res) => {
  try {
    const { deal_type, goal, walkaway, counterparty_context, session_id } =
      req.body;

    // Relaxed validation: Allow if we have EITHER the form fields OR extracted document data
    const session = ensureSession(session_id);
    const hasFormData = deal_type && goal && walkaway;
    const hasExtractedData = session.extractedData && Object.keys(session.extractedData).length > 0;

    if (!hasFormData && !hasExtractedData) {
      return res.status(400).json({
        error: "Missing parameters: Please provide negotiation details or upload a document.",
      });
    }

    const dealContext = { 
      deal_type: deal_type || "Document-Led Negotiation", 
      goal: goal || "See extracted document intelligence", 
      walkaway: walkaway || "Protect extracted baseline", 
      counterparty_context 
    };

    // Create or update session
    if (session.dealContext.deal_type !== "Unknown") {
      updateSession(session_id, { dealContext, transcript: [], whispers: [] });
    } else {
      updateSession(session_id, { dealContext });
    }
    const finalSession = getSession(session_id);

    // Build prompt and call Gemini (Agent 1)
    const prompt = buildSetupPrompt({ ...dealContext, extracted_data: session.extractedData });
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
