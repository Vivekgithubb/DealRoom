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
    const response = parseWhisperResponse(raw, reducedContext);

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
function parseWhisperResponse(raw, context = null) {
  try {
    const parsed = parseGeminiJSON(raw);

    // Validate and normalize the response
    const normalized = {
      suggestion: typeof parsed.suggestion === "string"
        ? parsed.suggestion
        : "N/A",
      script: typeof parsed.script === "string"
        ? parsed.script
        : "Take a moment before responding.",
      tactic: parsed.tactic || null,
      confidence: typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5,
      power_delta: typeof parsed.power_delta === "number"
        ? Math.max(-5, Math.min(5, parsed.power_delta))
        : 0,
      red_flag: Boolean(parsed.red_flag),
      sentiment: parsed.sentiment || "Neutral",
      risk_score: parsed.risk_score || "Low",
      reasoning: typeof parsed.reasoning === "string"
        ? parsed.reasoning
        : "Analysis complete.",
    };

    return applyNegotiationMoveGuard(applyWalkawayGuard(normalized, context), context);
  } catch (err) {
    console.error("Failed to parse whisper response:", err.message);
    // Fallback: return a safe default rather than crashing
    return {
      suggestion: "Tactical Pause",
      script: "Take a moment before responding.",
      tactic: "unknown",
      confidence: 0.4,
      power_delta: 0,
      red_flag: false,
      sentiment: "Neutral",
      risk_score: "Moderate",
      reasoning: "Could not parse model response.",
    };
  }
}

function applyWalkawayGuard(response, context) {
  if (!response || !context) {
    return response;
  }

  const walkawayValue = extractComparableNumber(context.walkaway);
  const goalValue = extractComparableNumber(context.goal);
  const scriptValue = extractComparableNumber(response.script);
  const direction = inferNegotiationDirection(goalValue, walkawayValue, context.deal_type);

  if (walkawayValue == null || scriptValue == null || direction === "unknown") {
    return response;
  }

  const crossesWalkaway =
    (direction === "maximize" && scriptValue < walkawayValue) ||
    (direction === "minimize" && scriptValue > walkawayValue);

  if (!crossesWalkaway) {
    return response;
  }

  const unitLabel = extractUnitLabel(context.walkaway, context.goal, response.script);
  const walkawayLabel = formatComparableValue(walkawayValue, unitLabel);
  const protectedScript =
    direction === "maximize"
      ? `That doesn't work for me. I can't go below ${walkawayLabel}.`
      : `That doesn't work for me. I can't go above ${walkawayLabel}.`;

  return {
    ...response,
    suggestion:
      direction === "maximize"
        ? "Hold firm at your floor"
        : "Protect your ceiling",
    script: protectedScript,
    red_flag: true,
    tactic: response.tactic || "lowball",
    risk_score: promoteRiskScore(response.risk_score),
    reasoning: `${response.reasoning} Guardrail applied: removed a counteroffer that crossed the user's walkaway (${walkawayLabel}).`,
  };
}

function applyNegotiationMoveGuard(response, context) {
  if (!response || !context || !Array.isArray(context.turns) || context.turns.length === 0) {
    return response;
  }

  const latestHostileTurn = [...context.turns].reverse().find((turn) => turn.speaker === "them");
  const hostileResistance = latestHostileTurn && hasResistanceLanguage(latestHostileTurn.text);
  const scriptHasNumber = extractComparableNumber(response.script) != null;

  if (!hostileResistance || !scriptHasNumber) {
    return response;
  }

  const replacement = buildNegotiationMoveReplacement(context);

  return {
    ...response,
    ...replacement,
    reasoning: `${response.reasoning} Guardrail applied: replaced a repetitive number push with a constraint-probing negotiation move after resistance.`,
  };
}

function inferNegotiationDirection(goalValue, walkawayValue, dealType = "") {
  if (goalValue != null && walkawayValue != null && goalValue !== walkawayValue) {
    return goalValue > walkawayValue ? "maximize" : "minimize";
  }

  const type = (dealType || "").toLowerCase();
  if (/(salary|offer|compensation|raise|package|ctc|job)/i.test(type)) {
    return "maximize";
  }

  return "unknown";
}

function extractComparableNumber(text) {
  if (!text || typeof text !== "string") {
    return null;
  }

  const digitMatch = text.match(/\b\d+(?:,\d{3})*(?:\.\d+)?\b/);
  if (digitMatch) {
    return Number.parseFloat(digitMatch[0].replace(/,/g, ""));
  }

  const phrases = text.match(NUMBER_WORD_SEQUENCE_REGEX) || [];
  for (const phrase of phrases) {
    const value = parseWordNumber(phrase);
    if (value != null) {
      return value;
    }
  }

  return null;
}

const NUMBER_WORD_SEQUENCE_REGEX =
  /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakh|lakhs|million|point)(?:[\s-]+(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakh|lakhs|million|point|and))*\b/gi;

function parseWordNumber(phrase) {
  if (!phrase) {
    return null;
  }

  const ones = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
  };
  const tens = {
    twenty: 20,
    thirty: 30,
    forty: 40,
    fifty: 50,
    sixty: 60,
    seventy: 70,
    eighty: 80,
    ninety: 90,
  };
  const scales = {
    hundred: 100,
    thousand: 1000,
    lakh: 100000,
    lakhs: 100000,
    million: 1000000,
  };

  const tokens = phrase
    .toLowerCase()
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => token !== "and");

  if (tokens.length === 0) {
    return null;
  }

  let total = 0;
  let current = 0;
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index];

    if (token === "point") {
      let decimals = "";
      for (let i = index + 1; i < tokens.length; i += 1) {
        const decimalToken = tokens[i];
        if (Object.prototype.hasOwnProperty.call(ones, decimalToken)) {
          decimals += String(ones[decimalToken]);
          continue;
        }
        break;
      }

      const integerPart = total + current;
      return decimals ? Number.parseFloat(`${integerPart}.${decimals}`) : integerPart;
    }

    if (Object.prototype.hasOwnProperty.call(ones, token)) {
      current += ones[token];
      index += 1;
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(tens, token)) {
      current += tens[token];
      index += 1;
      continue;
    }

    if (token === "hundred") {
      current = current === 0 ? 100 : current * 100;
      index += 1;
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(scales, token)) {
      total += (current || 1) * scales[token];
      current = 0;
      index += 1;
      continue;
    }

    index += 1;
  }

  const value = total + current;
  return Number.isFinite(value) && value !== 0 ? value : null;
}

function extractUnitLabel(...texts) {
  const combined = texts.filter(Boolean).join(" ").toLowerCase();

  if (combined.includes("lpa") || combined.includes("lakh per annum")) {
    return "LPA";
  }
  if (combined.includes("%") || combined.includes("percent")) {
    return "%";
  }
  if (combined.includes("usd") || combined.includes("$") || combined.includes("dollar")) {
    return "USD";
  }
  if (combined.includes("inr") || combined.includes("rupee") || combined.includes("rs")) {
    return "INR";
  }

  return "";
}

function formatComparableValue(value, unitLabel = "") {
  const formattedNumber = Number.isInteger(value) ? String(value) : String(value);
  return unitLabel ? `${formattedNumber} ${unitLabel}` : formattedNumber;
}

function promoteRiskScore(riskScore) {
  const normalized = (riskScore || "").toUpperCase();
  if (normalized === "CRITICAL") {
    return "Critical";
  }
  return "High";
}

function hasResistanceLanguage(text = "") {
  return /(can't|cannot|won't|wouldn't|not possible|nothing more|no more|max|maximum|budget|band|capped|cap|final|best we can do|highest|ceiling|approved|approval)/i.test(
    text
  );
}

function buildNegotiationMoveReplacement(context) {
  const combined = [context.deal_type, context.goal, context.walkaway]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/(salary|compensation|offer|ctc|lpa|package|bonus|equity|esop|job|role|interview)/i.test(combined)) {
    return {
      suggestion: "Probe constraints, expand package",
      script: "If base is capped, can we discuss bonus, review timing, or level?",
    };
  }

  if (/(vendor|procurement|purchase|pricing|license|subscription|saas|software|contract|renewal|service|consulting|freelance|agency)/i.test(combined)) {
    return {
      suggestion: "Trade terms, not just price",
      script: "If price is tight, what can move on scope, support, or payment terms?",
    };
  }

  if (/(partnership|channel|reseller|distribution|revenue share|revshare|joint venture|collaboration)/i.test(combined)) {
    return {
      suggestion: "Rework structure, not just price",
      script: "If headline terms are fixed, what can move on scope, rights, or commitments?",
    };
  }

  if (/(delivery|timeline|implementation|project|build|milestone|retainer)/i.test(combined)) {
    return {
      suggestion: "Trade timing and scope",
      script: "If the number is fixed, what can move on timing, scope, or milestones?",
    };
  }

  return {
    suggestion: "Probe constraints first",
    script: "If the headline term is fixed, what can move on scope, timing, or commitments?",
  };
}

module.exports = { handleWhisperTurn, parseWhisperResponse };
