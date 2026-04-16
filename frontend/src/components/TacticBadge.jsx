import { TACTIC_LABELS, TACTIC_COLORS } from "../contracts";
import useSessionStore from "../store/sessionStore";

const TACTIC_ICONS = {
  anchoring: "⚓",
  urgency_pressure: "⏰",
  social_proof: "👥",
  hard_close: "🔒",
  lowball: "📉",
  good_cop_bad_cop: "🎭",
  silence_pressure: "🤐",
  flinch: "😱",
  unknown: "❓",
};

export default function TacticBadge() {
  const currentWhisper = useSessionStore((s) => s.currentWhisper);

  if (!currentWhisper || !currentWhisper.tactic || currentWhisper.tactic === "null") {
    return null;
  }

  const tactic = currentWhisper.tactic;
  const label = TACTIC_LABELS[tactic] || tactic;
  const color = TACTIC_COLORS[tactic] || "#94a3b8";
  const icon = TACTIC_ICONS[tactic] || "🎯";

  return (
    <div
      className="tactic-badge"
      style={{
        color: color,
        borderColor: `${color}40`,
        background: `${color}15`,
      }}
    >
      <span className="tactic-badge-icon">{icon}</span>
      {label} Detected
    </div>
  );
}
