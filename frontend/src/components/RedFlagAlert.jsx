import { useState } from "react";
import useSessionStore from "../store/sessionStore";
import { ShieldAlert, X } from "lucide-react";

export default function RedFlagAlert() {
  const currentWhisper = useSessionStore((s) => s.currentWhisper);
  const [dismissed, setDismissed] = useState(false);
  const [lastWhisperKey, setLastWhisperKey] = useState(null);

  const whisperKey = currentWhisper ? currentWhisper.suggestion : null;
  if (whisperKey !== lastWhisperKey) {
    if (whisperKey !== lastWhisperKey) {
      setLastWhisperKey(whisperKey);
      setDismissed(false);
    }
  }

  if (!currentWhisper || !currentWhisper.red_flag || dismissed) {
    return null;
  }

  return (
    <div className="tactical-red-flag">
      <div className="red-flag-icon-container">
        <ShieldAlert size={20} />
      </div>
      <div className="red-flag-content">
        <div className="red-flag-label">PROTOCOL_THREAT_DETECTED</div>
        <div className="red-flag-msg">PRESSURE TACTICS IDENTIFIED. MAINTAIN BASELINE POSITIONS. REDUCE RESPONSE LATENCY.</div>
      </div>
      <button
        className="red-flag-close-btn"
        onClick={() => setDismissed(true)}
        title="Dismiss Threat"
      >
        <X size={16} />
      </button>

      <style>{`
        .tactical-red-flag {
          display: flex;
          align-items: center;
          background: #ff4545;
          color: #000000;
          padding: 12px 20px;
          gap: 15px;
          margin-bottom: 24px;
          font-family: 'JetBrains Mono', monospace;
          position: relative;
          box-shadow: 0 10px 30px rgba(255, 69, 69, 0.3);
          border-radius: 2px;
        }

        .red-flag-icon-container {
          animation: red-flag-shake 0.5s infinite;
        }

        .red-flag-label {
          font-weight: 900;
          font-size: 10px;
          letter-spacing: 0.1em;
        }

        .red-flag-msg {
          font-size: 12px;
          font-weight: 700;
        }

        .red-flag-close-btn {
          margin-left: auto;
          background: transparent;
          border: 1px solid rgba(0,0,0,0.2);
          color: #000000;
          padding: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .red-flag-close-btn:hover {
          background: rgba(0,0,0,0.1);
        }

        @keyframes red-flag-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
}
