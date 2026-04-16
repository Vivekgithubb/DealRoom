/**
 * contracts.js — Shared shape reference for both frontend and backend.
 * Commit this before splitting work. These are plain JS objects used as
 * documentation — no types, just structure + comments.
 */

/**
 * WhisperResponse
 * Emitted by the server via socket.emit("whisper:response", response)
 * after every "Them" turn. Every real-time feature derives from this object.
 *
 * {
 *   suggestion:   string   — ≤15 words. The next move for the user.
 *   tactic:       string   — What the other party just did. See VALID_TACTICS below. Null if none.
 *   confidence:   number   — 0.0 to 1.0. How confident the model is.
 *   power_delta:  number   — -5 to +5. Negative = their power increased.
 *   red_flag:     boolean  — True if pressure, urgency, or hard close detected.
 *   reasoning:    string   — 1 sentence. Why this suggestion. Shown on hover.
 * }
 */

const VALID_TACTICS = [
  "anchoring",
  "urgency_pressure",
  "social_proof",
  "hard_close",
  "lowball",
  "good_cop_bad_cop",
  "silence_pressure",
  "flinch",
  "unknown",
  null, // no tactic detected this turn
];

/**
 * TranscriptTurn
 * {
 *   speaker:    "me" | "them"
 *   text:       string
 *   timestamp:  number  (Date.now())
 * }
 */

/**
 * SessionContext
 * What gets passed into every whisper prompt after context reduction.
 * {
 *   deal_type:        string
 *   goal:             string
 *   walkaway:         string
 *   playbook_summary: string  — ≤200 words. Not the full playbook.
 *   turns:            TranscriptTurn[]  — Last 6-8 turns only.
 * }
 */

/**
 * ReportResponse
 * Emitted by the server via socket.emit("report:ready", response)
 * after POST /api/report resolves.
 *
 * {
 *   summary:                string    — 3-5 sentences.
 *   wins:                   string[]  — Moments where the user had advantage.
 *   losses:                 string[]  — Moments where they conceded unnecessarily.
 *   missed_opportunities:   string[]
 *   final_power_score:      number    — Accumulated power_delta total.
 *   follow_up_email:        string    — Ready-to-send professional email.
 *   negotiation_style:      string    — 1-2 sentences on observed style.
 * }
 */

const FALLBACK_WHISPER = {
  suggestion: "Pause and ask a clarifying question.",
  tactic: null,
  confidence: 0,
  power_delta: 0,
  red_flag: false,
  reasoning: "Suggestion unavailable — consider asking for time.",
};

module.exports = { VALID_TACTICS, FALLBACK_WHISPER };
