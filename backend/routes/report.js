/**
 * Report Route — Agent 3 (Closer)
 * 
 * POST /api/report
 * 
 * Input: session_id (full transcript + playbook pulled from session)
 * Output: summary, wins[], losses[], missed_opportunities[], follow_up_email, negotiation_style
 * 
 * This is a one-shot call at end of session. Latency is not critical.
 */

const express = require("express");
const router = express.Router();
const { callGemini, parseGeminiJSON } = require("../services/gemini");
const { buildReportPrompt } = require("../services/promptBuilder");
const { getSession } = require("../utils/sessionStore");

router.post("/", async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: "Missing session_id" });
    }

    const session = getSession(session_id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.transcript.length === 0) {
      return res.status(400).json({ error: "No transcript data available for report generation" });
    }

    // Calculate final power score from whispers
    const finalPowerScore = session.whispers.reduce(
      (acc, w) => acc + (w.power_delta || 0),
      0
    );

    // Build prompt with full transcript (not reduced — report needs everything)
    const prompt = buildReportPrompt({
      deal_type: session.dealContext.deal_type,
      goal: session.dealContext.goal,
      walkaway: session.dealContext.walkaway,
      playbook_summary: session.playbookSummary,
      transcript: session.transcript,
      whispers: session.whispers,
    });

    // Agent 3 needs more tokens for the full report
    let report;
    try {
      const raw = await callGemini(prompt, 800);
      report = parseGeminiJSON(raw);
    } catch (apiErr) {
      console.error("Gemini API or parse error:", apiErr.message);
      report = {
        summary: "The negotiation session has been completed. Review your transcript for key moments.",
        wins: ["Session completed"],
        losses: [],
        missed_opportunities: [],
        follow_up_email: "Thank you for your time today. I look forward to continuing our discussion.",
        negotiation_style: "Your negotiation style could not be analyzed at this time.",
      };
    }

    // Add final power score
    report.final_power_score = finalPowerScore;

    res.json({
      success: true,
      report,
    });
  } catch (err) {
    console.error("Report route error:", err.message);
    res.status(500).json({
      error: "Failed to generate report. Please try again.",
    });
  }
});

module.exports = router;
