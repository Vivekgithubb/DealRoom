/**
 * Simulate Route — Agent 4 (Simulator)
 * 
 * POST /api/simulate
 * 
 * Input: session_id (deal context from session)
 * Output: 3 paths — conservative, balanced, aggressive
 * 
 * Each path includes probability, risk, tradeoff.
 * Runs on demand from a dedicated UI panel.
 */

const express = require("express");
const router = express.Router();
const { callGemini, parseGeminiJSON } = require("../services/gemini");
const { buildSimulatePrompt } = require("../services/promptBuilder");
const { getSession } = require("../utils/sessionStore");

router.post("/", async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: "Missing session_id" });
    }

    const session = getSession(session_id);
    if (!session) {
      return res.status(404).json({ error: "Session not found. Please complete setup first." });
    }

    const prompt = buildSimulatePrompt({
      deal_type: session.dealContext.deal_type,
      goal: session.dealContext.goal,
      walkaway: session.dealContext.walkaway,
      playbook_summary: session.playbookSummary,
    });

    let simulation;
    try {
      const raw = await callGemini(prompt, 600);
      simulation = parseGeminiJSON(raw);
    } catch (apiErr) {
      console.error("Gemini API or parse error:", apiErr.message);
      console.error("Simulate parse error:", parseErr.message);
      // Return fallback simulation paths
      simulation = {
        paths: [
          {
            strategy: "conservative",
            label: "Play it safe",
            description: "Take a cautious approach, accepting terms close to their initial offer while protecting your walkaway point.",
            expected_outcome: "You'll likely reach an agreement safely but leave value on the table.",
            probability_of_success: 75,
            risk_level: "low",
            tradeoff: "You sacrifice potential upside for certainty.",
          },
          {
            strategy: "balanced",
            label: "Balanced push",
            description: "Push back moderately on key terms while showing flexibility on secondary items.",
            expected_outcome: "A fair deal that meets most of your core objectives.",
            probability_of_success: 55,
            risk_level: "medium",
            tradeoff: "Some tension in the relationship but better terms overall.",
          },
          {
            strategy: "aggressive",
            label: "High-risk high-reward",
            description: "Make ambitious demands and hold firm. Use competitive pressure and alternative offers as leverage.",
            expected_outcome: "Either a very favorable deal or a breakdown in negotiations.",
            probability_of_success: 30,
            risk_level: "high",
            tradeoff: "Risk of losing the deal entirely if they walk away.",
          },
        ],
      };
    }

    res.json({
      success: true,
      simulation,
    });
  } catch (err) {
    console.error("Simulate route error:", err.message);
    res.status(500).json({
      error: "Failed to generate simulation. Please try again.",
    });
  }
});

module.exports = router;
