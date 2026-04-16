/**
 * Prompt Builder
 *
 * Builds structured prompts for each of the 4 agents.
 * All prompts instruct Gemini to return JSON only.
 *
 * Agent 1: Strategist (setup)
 * Agent 2: Whisperer (real-time, per "Them" turn)
 * Agent 3: Closer (report)
 * Agent 4: Simulator (outcome paths)
 */

/**
 * Format transcript turns for prompt injection.
 * Each turn becomes "User: text" or "Other party: text"
 */
function formatTurns(turns) {
  return turns
    .map((t) => `${t.speaker === "me" ? "User" : "Other party"}: ${t.text}`)
    .join("\n");
}

/**
 * Agent 1 — Strategist
 * Runs once at session start. Builds the playbook.
 */
function buildSetupPrompt({ deal_type, goal, walkaway, counterparty_context }) {
  return `You are a negotiation strategist. Analyze this deal and create a concise playbook.

Deal type: ${deal_type}
User's goal: ${goal}
Walkaway point: ${walkaway}
Counterparty context: ${counterparty_context || "No specific context provided."}

Return ONLY a JSON object with this exact structure:
{
  "playbook_summary": "A 150-200 word strategic summary covering opening position, key leverage points, tactics to use, and what to avoid.",
  "opening_move": "One sentence describing the ideal first offer or opening statement.",
  "key_leverage": ["leverage point 1", "leverage point 2", "leverage point 3"],
  "red_lines": ["thing to never concede 1", "thing to never concede 2"]
}

Return only JSON. No preamble. No markdown fences.`;
}

/**
 * Agent 2 — Whisperer
 * Runs per "Them" turn. This is the core real-time loop.
 * Single Gemini call returns suggestion, tactic, confidence, power_delta, red_flag, and reasoning.
 */
function buildWhisperPrompt(context) {
  const turnsFormatted = formatTurns(context.turns);
  const latestTurn =
    context.turns.length > 0
      ? context.turns[context.turns.length - 1].text
      : "";

  return `You are a real-time negotiation decision engine.

Your goal is to MAXIMIZE outcome WITHOUT jeopardizing deal closure.

CORE PRINCIPLE:
Maximize value early. Preserve the deal late.

NEGOTIATION PHASE DETECTION:
You MUST first classify the current phase:
- "exploration" → wide gap, early negotiation
- "bargaining" → active back-and-forth
- "convergence" → both sides moving closer, small gaps
- "closing" → near agreement or already acceptable

BEHAVIOR MODE: ${context.behavior || "balanced"}

Behavior definitions:
- aggressive: push harder, but STILL respect convergence/closing phases
- balanced: optimize gain while protecting deal closure
- defensive: prioritize closing and minimizing risk

CRITICAL RULES:
1. If in "exploration" or "bargaining":
   → You MAY push for better terms

2. If in "convergence":
   → Reduce aggression
   → Only make SMALL, realistic improvements
   → Avoid resetting or widening the gap

3. If in "closing":
   → DO NOT push further unless upside is VERY safe
   → Prioritize closing the deal
   → Reinforce agreement or finalize

4. If the offer is already acceptable or near walkaway:
   → Prefer closing over pushing

5. NEVER damage a near-closed deal by over-negotiating

6. Detect signals of resistance or fatigue:
   → If present, reduce pressure and move toward close

Context:
- Deal type: ${context.deal_type}
- User's goal: ${context.goal}
- Walkaway point: ${context.walkaway}
- Strategy: ${context.playbook_summary}

Recent conversation:
${turnsFormatted}

The other party just said:
"${latestTurn}"

Decision rules:
1. Classify phase (exploration / bargaining / convergence / closing)
2. Evaluate offer vs walkaway and goal
3. Decide whether to:
   - push
   - slightly improve
   - hold
   - close

Return ONLY JSON:
{
  "suggestion": "Next best line to say (≤15 words)",
  "tactic": "anchoring | urgency_pressure | social_proof | hard_close | lowball | good_cop_bad_cop | silence_pressure | flinch | close | hold | null",
  "confidence": 0.85,
  "power_delta": -1,
  "red_flag": false,
  "reasoning": "Include phase + why pushing or closing is chosen."
}

Return only JSON. No explanation. No markdown.`;
}

/**
 * Agent 3 — Closer
 * Runs once when session ends. Generates the full report.
 */
function buildReportPrompt({
  deal_type,
  goal,
  walkaway,
  playbook_summary,
  transcript,
  whispers,
}) {
  const fullTranscript = formatTurns(transcript);

  // Build tactics summary from whisper history
  const tacticsUsed = whispers
    .filter((w) => w.tactic && w.tactic !== "unknown")
    .map((w) => w.tactic);
  const tacticsSummary =
    tacticsUsed.length > 0
      ? [...new Set(tacticsUsed)].join(", ")
      : "No specific tactics detected.";

  return `You are a negotiation analyst. Analyze this completed negotiation session.

Deal context:
- Type: ${deal_type}
- Goal: ${goal}
- Walkaway: ${walkaway}
- Strategy going in: ${playbook_summary}

Full transcript:
${fullTranscript}

Detected tactics during session: ${tacticsSummary}

Return ONLY a JSON object:
{
  "summary": "3-5 sentence overall assessment of how the negotiation went.",
  "wins": ["moment 1 where user had advantage", "moment 2"],
  "losses": ["moment where they unnecessarily conceded", "moment 2"],
  "missed_opportunities": ["thing they could have pushed on", "moment 2"],
  "follow_up_email": "A complete, professional follow-up email based on the outcome.",
  "negotiation_style": "2 sentences describing the user's observed negotiation style and one concrete improvement."
}

Return only JSON. No preamble. No markdown fences.`;
}

/**
 * Agent 4 — Simulator
 * Runs on demand. Simulates three negotiation paths.
 */
function buildSimulatePrompt({ deal_type, goal, walkaway, playbook_summary }) {
  return `You are a negotiation outcome predictor. Given this deal context, simulate three negotiation paths.

Deal type: ${deal_type}
Goal: ${goal}
Walkaway: ${walkaway}
Playbook: ${playbook_summary || "No playbook generated yet."}

Return ONLY a JSON object:
{
  "paths": [
    {
      "strategy": "conservative",
      "label": "Play it safe",
      "description": "2 sentences on this approach.",
      "expected_outcome": "Specific predicted outcome.",
      "probability_of_success": 72,
      "risk_level": "low",
      "tradeoff": "What you give up with this approach."
    },
    {
      "strategy": "balanced",
      "label": "Balanced push",
      "description": "2 sentences on this approach.",
      "expected_outcome": "Specific predicted outcome.",
      "probability_of_success": 58,
      "risk_level": "medium",
      "tradeoff": "What you give up with this approach."
    },
    {
      "strategy": "aggressive",
      "label": "High-risk high-reward",
      "description": "2 sentences on this approach.",
      "expected_outcome": "Specific predicted outcome.",
      "probability_of_success": 31,
      "risk_level": "high",
      "tradeoff": "What you give up with this approach."
    }
  ]
}

Return only JSON. No preamble. No markdown fences.`;
}

module.exports = {
  buildSetupPrompt,
  buildWhisperPrompt,
  buildReportPrompt,
  buildSimulatePrompt,
  formatTurns,
};
