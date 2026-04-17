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
function buildSetupPrompt({
  deal_type,
  goal,
  walkaway,
  counterparty_context,
  extracted_data,
}) {
  return `You are a negotiation strategist. Analyze this deal and create a concise playbook.

Deal type: ${deal_type}
User's goal: ${goal}
Walkaway point: ${walkaway}
Counterparty context: ${counterparty_context || "No specific context provided."}

${
  extracted_data
    ? `Additional structured data from uploaded documents:
${JSON.stringify(extracted_data, null, 2)}`
    : ""
}

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
// function buildWhisperPrompt(context) {
//   const turnsFormatted = formatTurns(context.turns);
//   const latestTurn =
//     context.turns.length > 0
//       ? context.turns[context.turns.length - 1].text
//       : "";
//   const claimMemory =
//     context.claim_memory && context.claim_memory.length > 0
//       ? context.claim_memory
//           .map((claim, index) => `${index + 1}. ${claim}`)
//           .join("\n")
//       : "None captured.";

//   return `You are a real-time negotiation decision engine.

// Your goal is to MAXIMIZE outcome WITHOUT jeopardizing deal closure.

// CORE PRINCIPLE:
// Maximize value early. Preserve the deal late.

// IMPORTANT:
// Negotiation is NOT just increasing the number every turn.
// You must choose the best next tactical move, which may be:
// - challenge the anchor
// - ask a calibrated question
// - diagnose the constraint
// - justify value with evidence
// - trade across multiple variables
// - package terms
// - test approval path
// - pause or hold
// - close

// NEGOTIATE, DO NOT JUST BARGAIN:
// - Bargaining = repeating numbers back and forth
// - Negotiation = improving the full deal structure
// - In every domain, prefer negotiating the full package, not only the headline number
// - Use variables such as scope, timing, quality, support, payment terms, milestones, volume, exclusivity, risk-sharing, approvals, renewal terms, delivery, and commitments whenever relevant

// NEGOTIATION PHASE DETECTION:
// You MUST first classify the current phase:
// - "exploration" → wide gap, early negotiation
// - "bargaining" → active back-and-forth
// - "convergence" → both sides moving closer, small gaps
// - "closing" → near agreement or already acceptable

// BEHAVIOR MODE: ${context.behavior || "balanced"}

// Behavior definitions:
// - aggressive: push harder, but STILL respect convergence/closing phases
// - balanced: optimize gain while protecting deal closure
// - defensive: prioritize closing and minimizing risk

// CRITICAL RULES:
// 1. If in "exploration" or "bargaining":
//    → You MAY push for better terms

// 2. If in "convergence":
//    → Reduce aggression
//    → Only make SMALL, realistic improvements
//    → Avoid resetting or widening the gap

// 3. If in "closing":
//    → DO NOT push further unless upside is VERY safe
//    → Prioritize closing the deal
//    → Reinforce agreement or finalize

// 4. If the offer is already acceptable or near walkaway:
//    → Prefer closing over pushing

// 5. NEVER damage a near-closed deal by over-negotiating

// 6. Detect signals of resistance or fatigue:
//    → If present, reduce pressure and move toward close

// 7. LOWBALL DETECTION: If the other party offers significantly less than the Goal (${context.goal}) or hits the Walkaway (${context.walkaway}), you MUST set red_flag to TRUE and power_delta to a negative value (-2 to -5).

// 8. CONTRADICTION DETECTION:
//    → Compare the latest other-party statement against the recent conversation and prior claim memory
//    → If they materially change or deny a number, price, range, budget, timeline, scope, approval status, exclusivity term, or constraint without a clear explanation, you MUST treat it as a contradiction
//    → For contradictions, set red_flag to TRUE, tactic to "contradiction", risk_score to HIGH or CRITICAL, and power_delta to a negative value (-2 to -4)
//    → In reasoning, explicitly mention the earlier claim and the latest conflicting claim
//    → Do NOT flag normal bargaining, a clearly labeled revised offer, or a justified concession as a contradiction

// 9. WALKAWAY PROTECTION:
//    → The user's walkaway (${context.walkaway}) is a HARD boundary.
//    → NEVER suggest a concrete counteroffer that is worse than the user's walkaway
//    → If the latest offer is worse than walkaway, do NOT split the difference below walkaway
//    → In that case, the script should reject the lowball, restate the user's floor, or ask for materially better terms

// 10. AGGRESSIVE MODE SAFETY:
//    → "Aggressive" means pushing harder for value, NOT conceding below the user's walkaway
//    → If behavior mode is aggressive and the other side is still below walkaway, keep the user's floor protected and push upward from strength

// 11. ANTI-REPETITION RULE:
//    → If the user already pushed with a number and the other side resisted, do NOT simply repeat a higher number again
//    → Switch to a real negotiation move:
//       - ask what is blocking approval
//       - ask whether the issue is budget, scope, timing, risk, policy, approval, capacity, or commercial structure
//       - justify the ask using value, impact, alternatives, or delivery confidence
//       - trade for a different variable instead of only price

// 12. MULTI-VARIABLE NEGOTIATION:
//    → In ANY negotiation, explore variables beyond the headline number:
//       - scope or deliverables
//       - quality level or support level
//       - delivery date or implementation timing
//       - payment terms or milestone structure
//       - contract length or renewal terms
//       - exclusivity or commitment size
//       - risk sharing, approvals, or decision path
//       - service levels, warranties, onboarding, training, or review checkpoints
//    → If the headline number appears capped, prefer exploring these variables over repeating the same numeric push

// 13. DOMAIN EXAMPLES:
//    → Salary: bonus, title, review cycle, joining support, equity
//    → Procurement / vendor: scope, term length, payment schedule, support, implementation
//    → Sales: volume, contract duration, onboarding, SLA, upsell path
//    → Services / freelance: deliverables, revisions, timeline, retainer, payment milestone
//    → Partnership: exclusivity, co-marketing, revenue share, territory, decision rights

// 14. SCRIPT QUALITY:
//    → The script should sound like a real negotiating move, not a repeated demand
//    → Use one concise move at a time
//    → Avoid sounding weak, vague, or robotic
//    → Avoid repeating the exact same ask from the prior user turn

// Context:
// - Deal type: ${context.deal_type}
// - User's goal: ${context.goal}
// - Walkaway point: ${context.walkaway}
// - Strategy: ${context.playbook_summary}
// ${context.extractedData ? `- Relevant structured data from documents: ${JSON.stringify(context.extractedData)}` : ""}
// - Prior claim memory from the other party:
// ${claimMemory}

// Recent conversation:
// ${turnsFormatted}

// The other party just said:
// "${latestTurn}"

// Decision rules:
// 1. Classify phase (exploration / bargaining / convergence / closing)
// 2. Evaluate offer vs walkaway and goal
// 3. Choose the best next move:
//    - challenge_anchor
//    - probe_constraint
//    - justify_value
//    - trade_variables
//    - package_terms
//    - test_ceiling
//    - hold
//    - close
// 4. Only use a new concrete number when it is strategically necessary. Otherwise prefer a stronger negotiation move.

// Return ONLY JSON:
// {
//   "suggestion": "Strategic summary (≤10 words)",
//   "script": "Verbatim text for the user to say (≤20 words). Never include a concrete number worse than walkaway. Do not mindlessly repeat a higher number after resistance.",
//   "tactic": "anchoring | urgency_pressure | social_proof | hard_close | lowball | good_cop_bad_cop | silence_pressure | flinch | contradiction | close | hold | null",
//   "confidence": 0.85,
//   "power_delta": -1,
//   "red_flag": false,
//   "sentiment": "Positive | Neutral | Aggressive",
//   "risk_score": "Low | Moderate | High | Critical",
//   "reasoning": "Include phase + why pushing or closing is chosen. If contradiction is detected, name both conflicting claims."
// }

// Return only JSON. No explanation. No markdown.`;
// }

function buildWhisperPrompt(context) {
  const turnsFormatted = formatTurns(context.turns);

  const latestTurn =
    context.turns.length > 0
      ? context.turns[context.turns.length - 1].text
      : "";

  const claimMemory =
    context.claim_memory && context.claim_memory.length > 0
      ? context.claim_memory
          .map((claim, index) => `${index + 1}. ${claim}`)
          .join("\n")
      : "None captured.";

  const userMoves =
    context.user_last_moves && context.user_last_moves.length > 0
      ? context.user_last_moves.join("\n")
      : "None.";

  return `You are a real-time negotiation decision engine.

Your objective is to maximize deal outcome WITHOUT risking deal collapse.
Your role:
- Think like a strategist
- Speak like a human negotiator
- Protect the deal while maximizing value

-----------------------------------
CORE PRINCIPLE:
Improve deal structure early. Secure the deal late. NEVER go past the walkaway.

NEGOTIATION DIRECTION (CRITICAL):
- If Goal is a LOWER number than Walkaway (e.g., buying, renting): You MUST push the number DOWN. Lower is better.
- If Goal is a HIGHER number than Walkaway (e.g., selling, salary): You MUST push the number UP. Higher is better.
- Understand the user's direction based on the Deal Type. Never push the number in a direction that harms the user.

-----------------------------------
NEGOTIATION BEHAVIOR MODE: ${context.behavior || "balanced"}

- "aggressive" → FIGHT for the Goal (${context.goal}). Do NOT settle just because the offer is near the Walkaway. Push back hard against poor offers. Take calculated risks to maximize value.
- "balanced" → Optimize value safely. Be firm but willing to trade if stuck.
- "defensive" → Prioritize closing the deal and risk reduction, even if it means settling near the Walkaway. 

-----------------------------------
NEGOTIATION IS NOT JUST PRICE:

Always consider:
- scope
- timing
- payment terms
- contract length
- support
- risk sharing
- approvals
- bonuses / incentives

-----------------------------------
MANDATORY INTERNAL THINKING STEPS:

STEP 1 — ANALYZE
- Identify phase: exploration | bargaining | convergence | closing
- Detect tactic used by other party
- Compare current position vs goal (${context.goal}) and walkaway (${context.walkaway})
- Detect resistance, pressure, or contradiction

STEP 2 — DECIDE
Choose ONE best move:
- challenge_anchor
- probe_constraint
- justify_value
- trade_variables
- package_terms
- test_ceiling
- hold
- close

Apply rules:
- Respect the Behavior Mode ("${context.behavior || "balanced"}"). If aggressive, do NOT settle early.
- DO NOT repeat same move if it already failed.
- Reduce aggression in convergence/closing ONLY IF behavior is not "aggressive".
- If stuck → shift to variables (NOT just price).

STEP 3 — RESPOND
- Generate ONE strong, natural negotiation move.
- Sound human, confident, and concise.

-----------------------------------
CRITICAL RULES:

- NEVER suggest anything worse than walkaway (${context.walkaway}).
- If offer is worse than walkaway → Reject it firmly and push back.
- DO NOT mindlessly step numbers without a reason.
- Detect fatigue → reduce pressure (unless 'aggressive').
- Detect pressure tactics → mark red_flag = true.

-----------------------------------
UNACCEPTABLE OFFER DETECTION:
If the offer is completely unacceptable based on the Goal (${context.goal}) and Walkaway (${context.walkaway}):
→ red_flag = true
→ power_delta = negative (-2 to -5)
→ You MUST reject or counter strongly.

-----------------------------------
CONTRADICTION DETECTION:
If current claim conflicts with prior claim:
→ tactic = "contradiction"
→ red_flag = true
→ risk_score = High or Critical
→ reasoning MUST mention both claims

-----------------------------------
ANTI-REPETITION RULE:
If user already pushed and got resistance:
→ switch strategy:
   - ask constraint
   - justify value
   - shift variables

-----------------------------------
MULTI-VARIABLE NEGOTIATION:
If price is capped → explore:
- bonus
- timing
- scope
- payment structure
- contract terms

-----------------------------------
CONTEXT:

Deal type: ${context.deal_type}
Goal: ${context.goal}
Walkaway: ${context.walkaway}
Direction: The LLM must infer if it is minimizing or maximizing based on Goal and Walkaway.
Strategy: ${context.playbook_summary}

${context.extractedData ? `Structured data: ${JSON.stringify(context.extractedData)}` : ""}

Prior claims:
${claimMemory}

Recent user strategies:
${userMoves}

Conversation:
${turnsFormatted}

Other party just said:
"${latestTurn}"

-----------------------------------

Return ONLY valid JSON:

{
  "suggestion": "Strategic summary (≤10 words)",
  "script": "Natural sentence for user (≤35 words, human tone, no repetition, no weak phrasing)",
  "tactic": "anchoring | urgency_pressure | social_proof | hard_close | lowball | good_cop_bad_cop | silence_pressure | flinch | contradiction | close | hold | null",
  "confidence": 0.85,
  "power_delta": -1,
  "red_flag": false,
  "sentiment": "Positive | Neutral | Aggressive",
  "risk_score": "Low | Moderate | High | Critical",
  "reasoning": "Short explanation including phase and decision logic"
}

Return ONLY JSON. No markdown. No explanation.`;
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
function buildSimulatePrompt({
  deal_type,
  goal,
  walkaway,
  playbook_summary,
  extracted_data,
}) {
  return `You are a negotiation outcome predictor. Given this deal context, simulate three negotiation paths.

Deal type: ${deal_type}
Goal: ${goal}
Walkaway: ${walkaway}
Playbook: ${playbook_summary || "No playbook generated yet."}

${
  extracted_data
    ? `Structured data from uploaded documents:
${JSON.stringify(extracted_data, null, 2)}`
    : ""
}

Return ONLY a JSON object:
{
  "paths": [
    {
      "strategy": "conservative",
      "label": "Play it safe",
      "description": "2 sentences on this approach.",
      "predicted_price": "One specific target number or value (e.g. $105,000)",
      "expected_outcome": "Specific predicted outcome.",
      "probability_of_success": 72,
      "risk_level": "low",
      "tradeoff": "What you give up with this approach."
    },
    {
      "strategy": "balanced",
      "label": "Balanced push",
      "description": "2 sentences on this approach.",
      "predicted_price": "One specific target number or value (e.g. $112,000)",
      "expected_outcome": "Specific predicted outcome.",
      "probability_of_success": 58,
      "risk_level": "medium",
      "tradeoff": "What you give up with this approach."
    },
    {
      "strategy": "aggressive",
      "label": "High-risk high-reward",
      "description": "2 sentences on this approach.",
      "predicted_price": "One ambitious target number or value (e.g. $125,000)",
      "expected_outcome": "Specific predicted outcome.",
      "probability_of_success": 31,
      "risk_level": "high",
      "tradeoff": "What you give up with this approach."
    }
  ]
}

Return only JSON. No preamble. No markdown fences.`;
}

function buildPracticeStartPrompt({
  deal_type,
  goal,
  walkaway,
  playbook_summary,
  extracted_data,
  counterpart_brief,
}) {
  return `You are roleplaying ONLY the counterpart in this training scenario.

You are NOT the user.
You must negotiate from the counterpart's side only.

Scenario:
- Deal type: ${deal_type}
- CRITICAL: You DO NOT know the user's secret limits. You only know your own constraints below.
${extracted_data ? `- Background from uploaded documents: ${JSON.stringify(extracted_data)}` : ""}
- Counterpart brief:
${JSON.stringify(counterpart_brief, null, 2)}

Rules:
- Start the conversation naturally
- Sound like a real human under business pressure
- Introduce a negotiation anchor in the opening, and various different stratergies throughout the negotiation
- Make the scenario realistic and slightly tense
- Speak from the counterpart's perspective only based on the counterpart brief
- IMPORTANT: Adhere strictly to your concession guardrails and counterpart_goal
- NEVER quickly give in to threats of walking away. Hold your ground if it crosses your limits.
- Do not say things that sound like the user arguing for themselves
- Keep response under 35 words
- Return ONLY the line of dialogue

Return only text. No quotes. No labels.`;
}

function buildPracticeRespondPrompt({
  deal_type,
  goal,
  walkaway,
  playbook_summary,
  extracted_data,
  turns,
  practice_turns,
  counterpart_brief,
}) {
  const turnsFormatted = formatTurns(turns);

  return `You are roleplaying ONLY the counterpart in a negotiation training scenario.

Continue the negotiation realistically.

Context:
- Deal type: ${deal_type}
- CRITICAL: You DO NOT know the user's secret limits. You only know your own constraints below.
- Current round: ${practice_turns}
${extracted_data ? `- Document background: ${JSON.stringify(extracted_data)}` : ""}
- Counterpart brief:
${JSON.stringify(counterpart_brief, null, 2)}

Conversation so far:
${turnsFormatted}

Rules:
- Respond like a human, never like an AI assistant
- Use realistic business language and clear details
- Occasionally use negotiation tactics such as anchoring, urgency, pressure, or lowballing
- Keep the environment realistic and pressure-based
- Stay on the counterpart's side at all times. Adhere strictly to your counterpart_goal.
- NEVER quickly give in to threats of walking away. Hold your ground firmly to your anchor or constraints.
- Never say lines that make you sound like the candidate, buyer, or user defending themselves
- If you make a concession, frame it clearly as your side moving, without exceeding your guardrails
- Stay concise: 1-2 sentences, maximum 35 words
- Do NOT explain your reasoning
- Do NOT break character
- Return ONLY the next line of dialogue

Return only text. No quotes. No labels.`;
}

function buildPracticeCounterpartPrompt({
  deal_type,
  goal,
  walkaway,
  playbook_summary,
  extracted_data,
}) {
  return `You are creating the OTHER SIDE of a negotiation training scenario.

The user will practice against this counterpart.

Scenario:
- Deal type: ${deal_type}
- User goal: ${goal}
- User walkaway: ${walkaway}
- User strategy context: ${playbook_summary || "No playbook summary available."}
${extracted_data ? `- Background from uploaded documents: ${JSON.stringify(extracted_data)}` : ""}

Create a realistic counterpart brief that OPPOSES or resists the user's goal while staying believable.

Return ONLY JSON:
{
  "counterpart_role": "Who the counterpart is, e.g. hiring manager, procurement lead, buyer, seller",
  "counterpart_side": "Short description of the side they represent",
  "counterpart_goal": "What the counterpart wants instead of the user's goal",
  "counterpart_constraints": ["constraint 1", "constraint 2"],
  "counterpart_style": "How they negotiate under pressure",
  "opening_anchor": "The first realistic anchor they should use",
  "concession_guardrails": ["what they can move on", "what they should protect"]
}

Rules:
- The counterpart must not share the user's incentives
- The counterpart should feel realistic, professional, and slightly resistant
- Keep all fields concise

Return only JSON. No markdown. No preamble.`;
}

function buildPracticeReportPrompt({
  deal_type,
  goal,
  walkaway,
  playbook_summary,
  transcript,
  whispers,
}) {
  const fullTranscript = formatTurns(transcript);
  const tacticsUsed = whispers
    .filter((w) => w.tactic && w.tactic !== "unknown")
    .map((w) => w.tactic);

  return `You are an elite negotiation coach reviewing a practice drill.

Analyze the simulated negotiation in detail and teach the user how to improve.

Practice context:
- Deal type: ${deal_type}
- Goal: ${goal}
- Walkaway: ${walkaway}
- Strategy before practice: ${playbook_summary || "No playbook summary available."}
- Counterparty tactics observed: ${tacticsUsed.length > 0 ? [...new Set(tacticsUsed)].join(", ") : "No clear tactics detected."}

Transcript:
${fullTranscript}

Return ONLY JSON:
{
  "summary": "A detailed 4-6 sentence recap of what happened in the practice session.",
  "strengths": ["specific thing the user did well", "specific thing the user did well"],
  "mistakes": ["specific mistake and why it mattered", "specific mistake and why it mattered"],
  "missed_opportunities": ["moment where the user could have improved outcome", "moment where the user could have improved outcome"],
  "detected_tactics": ["tactic used by the AI counterpart and how it showed up", "another tactic and its impact"],
  "improvement_plan": ["concrete improvement step", "concrete improvement step", "concrete improvement step"],
  "drill_recommendation": "A focused next drill the user should practice.",
  "negotiation_style": "2-3 sentences describing the user's current negotiation style and what to sharpen next.",
  "practice_score": 78
}

Return only JSON. No markdown. No preamble.`;
}

module.exports = {
  buildSetupPrompt,
  buildWhisperPrompt,
  buildReportPrompt,
  buildSimulatePrompt,
  buildPracticeStartPrompt,
  buildPracticeRespondPrompt,
  buildPracticeCounterpartPrompt,
  buildPracticeReportPrompt,
  formatTurns,
};
