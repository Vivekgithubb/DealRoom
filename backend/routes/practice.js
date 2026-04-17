const express = require("express");
const router = express.Router();
const { callGemini, parseGeminiJSON } = require("../services/gemini");
const {
  buildPracticeStartPrompt,
  buildPracticeRespondPrompt,
  buildPracticeCounterpartPrompt,
  buildPracticeReportPrompt,
  buildWhisperPrompt,
} = require("../services/promptBuilder");
const { ensureSession, getSession, updateSession } = require("../utils/sessionStore");
const { reduceContext } = require("../utils/contextReducer");
const { parseWhisperResponse } = require("../sockets/whisperSocket");
const { FALLBACK_WHISPER } = require("../contracts");

const PRACTICE_MODEL = "llama-3.3-70b-versatile";
const PRACTICE_MIN_TURNS = 6;
const PRACTICE_MAX_TURNS = 8;
const PRACTICE_FALLBACK_LINE = "Can you clarify your position?";

router.post("/start", async (req, res) => {
  try {
    const { deal_type, goal, walkaway, session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: "Missing session_id" });
    }

    const session = ensureSession(session_id);
    const mergedContext = {
      deal_type: deal_type || session.dealContext.deal_type,
      goal: goal || session.dealContext.goal,
      walkaway: walkaway || session.dealContext.walkaway,
    };

    if (
      !mergedContext.deal_type ||
      mergedContext.deal_type === "Unknown" ||
      !mergedContext.goal ||
      !mergedContext.walkaway
    ) {
      return res.status(400).json({
        error: "Missing practice context. Complete setup before starting practice mode.",
      });
    }

    updateSession(session_id, {
      dealContext: { ...session.dealContext, ...mergedContext },
      practiceTranscript: [],
      practiceTurns: 0,
      practiceWhispers: [],
      practiceCounterpart: null,
    });

    const freshSession = getSession(session_id);
    const practiceCounterpart = await buildPracticeCounterpart(freshSession);
    freshSession.practiceCounterpart = practiceCounterpart;
    const prompt = buildPracticeStartPrompt({
      ...freshSession.dealContext,
      playbook_summary: freshSession.playbookSummary,
      extracted_data: freshSession.extractedData,
      counterpart_brief: practiceCounterpart,
    });

    const aiMessage = normalizePracticeText(
      await safePracticeText(prompt, 90),
      PRACTICE_FALLBACK_LINE
    );

    freshSession.practiceTranscript.push({
      speaker: "them",
      text: aiMessage,
      timestamp: Date.now(),
    });
    freshSession.practiceTurns = 1;

    const whisper = await buildPracticeWhisper(freshSession);
    freshSession.practiceWhispers.push(whisper);

    res.json({
      success: true,
      ai_message: aiMessage,
      practice_transcript: freshSession.practiceTranscript,
      practice_turns: freshSession.practiceTurns,
      whisper,
      can_end: false,
      session_complete: false,
    });
  } catch (err) {
    console.error("Practice start error:", err.message);
    res.status(500).json({
      error: "Failed to start practice mode. Please try again.",
    });
  }
});

router.post("/respond", async (req, res) => {
  try {
    const { user_message, session_id } = req.body;

    if (!session_id || !user_message) {
      return res.status(400).json({ error: "Missing session_id or user_message" });
    }

    const session = getSession(session_id);
    if (!session) {
      return res.status(404).json({ error: "Session not found. Complete setup first." });
    }

    session.practiceTranscript.push({
      speaker: "me",
      text: user_message,
      timestamp: Date.now(),
    });

    const lastTurns = session.practiceTranscript.slice(-6);
    const prompt = buildPracticeRespondPrompt({
      ...session.dealContext,
      playbook_summary: session.playbookSummary,
      extracted_data: session.extractedData,
      turns: lastTurns,
      practice_turns: session.practiceTurns + 1,
      counterpart_brief: session.practiceCounterpart || createFallbackCounterpart(session.dealContext),
    });

    const aiMessage = normalizePracticeText(
      await safePracticeText(prompt, 110),
      PRACTICE_FALLBACK_LINE
    );

    session.practiceTranscript.push({
      speaker: "them",
      text: aiMessage,
      timestamp: Date.now(),
    });
    session.practiceTurns += 1;

    const whisper = await buildPracticeWhisper(session);
    session.practiceWhispers.push(whisper);

    const sessionComplete = session.practiceTurns >= PRACTICE_MAX_TURNS;

    res.json({
      success: true,
      ai_message: aiMessage,
      practice_transcript: session.practiceTranscript,
      practice_turns: session.practiceTurns,
      whisper,
      can_end: session.practiceTurns >= PRACTICE_MIN_TURNS,
      session_complete: sessionComplete,
    });
  } catch (err) {
    console.error("Practice respond error:", err.message);
    res.status(500).json({
      error: "Failed to continue practice mode. Please try again.",
    });
  }
});

router.post("/report", async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: "Missing session_id" });
    }

    const session = getSession(session_id);
    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }

    if (!session.practiceTranscript || session.practiceTranscript.length === 0) {
      return res.status(400).json({ error: "No practice transcript available." });
    }

    const prompt = buildPracticeReportPrompt({
      ...session.dealContext,
      playbook_summary: session.playbookSummary,
      transcript: session.practiceTranscript,
      whispers: session.practiceWhispers || [],
    });

    let report;
    try {
      const raw = await callGemini(prompt, 900, PRACTICE_MODEL);
      report = parseGeminiJSON(raw);
      if (!isValidPracticeReport(report)) {
        throw new Error("Invalid practice report payload");
      }
    } catch (apiErr) {
      console.error("Practice report generation failed:", apiErr.message);
      report = createFallbackPracticeReport(session.practiceTranscript.length);
    }

    res.json({
      success: true,
      report,
    });
  } catch (err) {
    console.error("Practice report error:", err.message);
    res.status(500).json({
      error: "Failed to generate practice report. Please try again.",
    });
  }
});

async function safePracticeText(prompt, maxTokens) {
  try {
    return await callGemini(prompt, maxTokens, PRACTICE_MODEL, "text");
  } catch (err) {
    console.error("Practice text generation failed:", err.message);
    return PRACTICE_FALLBACK_LINE;
  }
}

async function buildPracticeCounterpart(session) {
  const prompt = buildPracticeCounterpartPrompt({
    ...session.dealContext,
    playbook_summary: session.playbookSummary,
    extracted_data: session.extractedData,
  });

  try {
    const raw = await callGemini(prompt, 300, PRACTICE_MODEL);
    const parsed = parseGeminiJSON(raw);
    if (!isValidCounterpart(parsed)) {
      throw new Error("Invalid counterpart brief payload");
    }
    return parsed;
  } catch (err) {
    console.error("Practice counterpart generation failed:", err.message);
    return createFallbackCounterpart(session.dealContext);
  }
}

async function buildPracticeWhisper(session) {
  try {
    const whisperContext = {
      ...reduceContext(
        {
          dealContext: session.dealContext,
          playbookSummary: session.playbookSummary,
          extractedData: session.extractedData,
          transcript: session.practiceTranscript,
        },
        6
      ),
      behavior: "balanced",
    };
    const prompt = buildWhisperPrompt(whisperContext);

    const raw = await callGemini(prompt, 220, PRACTICE_MODEL);
    return parseWhisperResponse(raw, whisperContext);
  } catch (err) {
    console.error("Practice whisper generation failed:", err.message);
    return {
      ...FALLBACK_WHISPER,
      script: "Try asking a calibrated question before committing.",
      sentiment: "Neutral",
      risk_score: "Moderate",
      reasoning: "Fallback coaching activated after the practice turn.",
    };
  }
}

function normalizePracticeText(raw, fallback) {
  if (!raw || typeof raw !== "string") {
    return fallback;
  }

  return raw
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim() || fallback;
}

function createFallbackPracticeReport(transcriptLength) {
  return {
    summary: `You completed a ${transcriptLength}-message practice drill. Focus on slowing down, naming the tactic in play, and protecting your walkaway before conceding.`,
    strengths: [
      "You stayed engaged through the full practice exchange.",
      "You kept the conversation moving instead of freezing under pressure.",
    ],
    mistakes: [
      "Your responses likely needed tighter structure around goal, value, and boundary.",
      "You may have reacted to pressure instead of reframing the negotiation on your terms.",
    ],
    missed_opportunities: [
      "You could have asked more calibrated questions before responding to pressure.",
      "You could have tied concessions to reciprocity instead of making them feel one-sided.",
    ],
    detected_tactics: [
      "The counterpart used anchoring and pressure to test your baseline.",
      "Moments of urgency were used to speed up your decisions.",
    ],
    improvement_plan: [
      "State your goal in one sentence before making any concession.",
      "Use one clarifying question before answering difficult asks.",
      "Trade every concession for something concrete in return.",
    ],
    drill_recommendation: "Repeat this scenario and practice handling lowball anchors with calm, specific pushback.",
    negotiation_style: "You show willingness to engage, but you need sharper control over pacing and framing. Work on slowing down and resetting the terms when pressure rises.",
    practice_score: 70,
  };
}

function isValidPracticeReport(report) {
  return Boolean(
    report &&
      typeof report.summary === "string" &&
      Array.isArray(report.strengths) &&
      Array.isArray(report.mistakes) &&
      Array.isArray(report.improvement_plan)
  );
}

function isValidCounterpart(counterpart) {
  return Boolean(
    counterpart &&
      typeof counterpart.counterpart_role === "string" &&
      typeof counterpart.counterpart_goal === "string" &&
      Array.isArray(counterpart.counterpart_constraints)
  );
}

function createFallbackCounterpart(dealContext = {}) {
  const type = (dealContext.deal_type || "").toLowerCase();

  if (type.includes("salary") || type.includes("job") || type.includes("offer")) {
    return {
      counterpart_role: "Hiring manager",
      counterpart_side: "Employer trying to close the role within budget",
      counterpart_goal: "Hire the candidate while protecting salary band and PTO policy",
      counterpart_constraints: [
        "Compensation band is tightly reviewed",
        "Too many concessions set a precedent for the team",
      ],
      counterpart_style: "Professional, skeptical, and budget-conscious",
      opening_anchor: "Start at the lower end of the approved compensation band",
      concession_guardrails: [
        "Can move slightly on compensation or benefits if justified",
        "Should protect internal salary parity and approval limits",
      ],
    };
  }

  return {
    counterpart_role: "Commercial decision-maker",
    counterpart_side: "Counterparty protecting value, budget, and leverage",
    counterpart_goal: "Reach a deal on terms more favorable to their side than the user's target",
    counterpart_constraints: [
      "Needs to justify the deal internally",
      "Cannot concede too quickly without losing leverage",
    ],
    counterpart_style: "Calm, realistic, and pressure-aware",
    opening_anchor: "Open with a firm but realistic anchor that resists the user's ideal outcome",
    concession_guardrails: [
      "Can make limited concessions for reciprocity",
      "Should protect the most important commercial terms",
    ],
  };
}

module.exports = router;
