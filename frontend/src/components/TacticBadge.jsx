import { TACTIC_LABELS } from "../contracts";
import useSessionStore from "../store/sessionStore";
import { AlertTriangle, ShieldAlert } from "lucide-react";

export default function TacticBadge() {
  const currentWhisper = useSessionStore((s) => s.currentWhisper);

  if (!currentWhisper || !currentWhisper.tactic || currentWhisper.tactic === "null") {
    return null;
  }

  const tactic = currentWhisper.tactic;
  const label = TACTIC_LABELS[tactic] || tactic;

  return (
    <div className="tactical-tactic-detected">
      <div className="tactic-warning-icon">
        <ShieldAlert size={20} />
      </div>
      <div className="tactic-info">
        <div className="tactic-status">HOSTILE_TACTIC_DETECTED</div>
        <div className="tactic-label">{label.toUpperCase()}</div>
      </div>
      <style>{`
        .tactical-tactic-detected {
          display: flex;
          align-items: center;
          gap: 15px;
          background: #ff454511;
          border: 1px solid #ff454544;
          padding: 12px;
          font-family: 'JetBrains Mono', monospace;
        }

        .tactic-warning-icon {
          color: #ff4545;
          animation: pulse-danger 1s infinite;
        }

        .tactic-status {
          font-size: 8px;
          color: #ff4545;
          font-weight: 700;
          letter-spacing: 0.1em;
        }

        .tactic-label {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px;
          color: #FFFFFF;
          letter-spacing: 0.05em;
          line-height: 1;
        }

        @keyframes pulse-danger {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
