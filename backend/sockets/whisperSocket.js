/**
 * Whisper Socket Handler — Agent 2 (Core real-time loop)
 * 
 * Triggered via Socket.io when the other party speaks.
 * 
 * Flow:
 * 1. Add turn to session transcript
 * 2. Reduce context to last 7 turns
 * 3. Build prompt
 * 4. Call Gemini ONCE
 * 5. Parse JSON safely
 * 6. Emit whisper response to client
 */

const { callGemini, parseGeminiJSON } = require("../services/gemini");
const { buildWhisperPrompt } = require("../services/promptBuilder");
const { reduceContext } = require("../utils/contextReducer");
const { getSession } = require("../utils/sessionStore");
const { FALLBACK_WHISPER } = require("../contracts");

async function handleWhisperTurn(socket, data, io) {
  const { text, session_id, behaviorMode } = data;

  if (!text || !session_id) {
    socket.emit("whisper:error", { message: "Missing text or session_id." });
    return;
  }

  const session = getSession(session_id);

  if (!session) {
    socket.emit("whisper:error", { message: "Session not found. Please complete setup first." });
    return;
  }

  // Add this turn to session transcript before reducing
  session.transcript.push({
    speaker: "them",
    text,
    timestamp: Date.now(),
  });

  // Reduce context to last 7 turns
  const reducedContext = {
    ...reduceContext(session, 7),
    behavior: behaviorMode || "balanced"
  };

  // Build the prompt — single call, returns all fields
  const prompt = buildWhisperPrompt(reducedContext);

  try {
    const raw = await callGemini(prompt);
    const response = parseWhisperResponse(raw);

    // Store whisper in session for report generation later
    session.whispers.push(response);

    // Push to client — this is why Socket.io is necessary
    socket.emit("whisper:response", response);
  } catch (err) {
    console.error("Whisper engine error:", err.message);

    // Do not crash. Emit a safe fallback response.
    // The user should always see a card, even if the model failed.
    socket.emit("whisper:response", {
      ...FALLBACK_WHISPER,
      reasoning: "Could not generate suggestion — consider asking for time.",
    });
  }
}

/**
 * Parse whisper response from Gemini.
 * Handles markdown fences, preamble text, and malformed JSON.
 */
function parseWhisperResponse(raw) {
  try {
    const parsed = parseGeminiJSON(raw);

    // Validate and normalize the response
    return {
      suggestion: typeof parsed.suggestion === "string"
        ? parsed.suggestion.slice(0, 100)
        : "Take a moment before responding.",
      tactic: parsed.tactic || null,
      confidence: typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5,
      power_delta: typeof parsed.power_delta === "number"
        ? Math.max(-5, Math.min(5, parsed.power_delta))
        : 0,
      red_flag: Boolean(parsed.red_flag),
      reasoning: typeof parsed.reasoning === "string"
        ? parsed.reasoning
        : "Analysis complete.",
    };
  } catch (err) {
    console.error("Failed to parse whisper response:", err.message);
    // Fallback: return a safe default rather than crashing
    return {
      suggestion: "Take a moment before responding.",
      tactic: "unknown",
      confidence: 0.4,
      power_delta: 0,
      red_flag: false,
      reasoning: "Could not parse model response.",
    };
  }
}

module.exports = { handleWhisperTurn };
