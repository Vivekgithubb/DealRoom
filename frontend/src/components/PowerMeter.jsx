import { usePowerMeter } from "../hooks/usePowerMeter";

export default function PowerMeter() {
  const { percentage, label, color, powerScore } = usePowerMeter();

  // Calculate fill position
  // If percentage > 50, fill from 50% towards right
  // If percentage < 50, fill from percentage towards 50%
  const fillStyle =
    percentage >= 50
      ? {
          left: "50%",
          width: `${percentage - 50}%`,
          background: `linear-gradient(90deg, var(--color-success), ${color})`,
        }
      : {
          left: `${percentage}%`,
          width: `${50 - percentage}%`,
          background: `linear-gradient(90deg, ${color}, var(--color-danger))`,
        };

  return (
    <div className="card power-meter">
      <div className="power-meter-header">
        <span className="power-meter-title">⚡ Power Balance</span>
        <span
          className="power-meter-score"
          style={{
            color: color,
            borderColor: color,
            background: `${color}15`,
          }}
        >
          {label}
        </span>
      </div>

      <div className="power-meter-bar-container">
        <div className="power-meter-center-line" />
        <div className="power-meter-fill" style={fillStyle} />
      </div>

      <div className="power-meter-labels">
        <span>Their Advantage</span>
        <span
          style={{
            color: color,
            fontWeight: "var(--font-semibold)",
          }}
        >
          {powerScore > 0 ? "+" : ""}
          {powerScore}
        </span>
        <span>Your Advantage</span>
      </div>
    </div>
  );
}
