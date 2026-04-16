/**
 * contracts.js — Frontend mirror of backend contracts.
 * Shared shape reference for documentation purposes.
 */

export const VALID_TACTICS = [
  "anchoring",
  "urgency_pressure",
  "social_proof",
  "hard_close",
  "lowball",
  "good_cop_bad_cop",
  "silence_pressure",
  "flinch",
  "unknown",
  null,
];

export const TACTIC_LABELS = {
  anchoring: "Anchoring",
  urgency_pressure: "Urgency Pressure",
  social_proof: "Social Proof",
  hard_close: "Hard Close",
  lowball: "Lowball",
  good_cop_bad_cop: "Good Cop / Bad Cop",
  silence_pressure: "Silence Pressure",
  flinch: "Flinch",
  unknown: "Unknown Tactic",
};

export const TACTIC_COLORS = {
  anchoring: "#6366f1",
  urgency_pressure: "#ef4444",
  social_proof: "#f59e0b",
  hard_close: "#dc2626",
  lowball: "#f97316",
  good_cop_bad_cop: "#8b5cf6",
  silence_pressure: "#64748b",
  flinch: "#ec4899",
  unknown: "#94a3b8",
};

export const FALLBACK_WHISPER = {
  suggestion: "Pause and ask a clarifying question.",
  tactic: null,
  confidence: 0,
  power_delta: 0,
  red_flag: false,
  reasoning: "Suggestion unavailable — consider asking for time.",
};
