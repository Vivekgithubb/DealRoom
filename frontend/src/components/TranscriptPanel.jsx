import { useRef, useEffect } from "react";
import useSessionStore from "../store/sessionStore";

export default function TranscriptPanel() {
  const transcript = useSessionStore((s) => s.transcript);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const formatTime = (timestamp) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="tactical-transcript-container">
      <div className="transcript-scroll" ref={scrollRef}>
        {transcript.length === 0 ? (
          <div className="transcript-empty-tactical">
            <div className="empty-line">_ NO_ACTIVE_FEED_DETECTED</div>
            <div className="empty-line">_ INITIALIZE_TRANSMISSION_TO_START_LOGGING</div>
          </div>
        ) : (
          transcript.map((turn, i) => (
            <div key={i} className={`tactical-turn ${turn.speaker === 'me' ? 'turn-me' : 'turn-them'}`}>
              <div className="turn-metadata">
                <span className="turn-timestamp">[{formatTime(turn.timestamp)}]</span>
                <span className="turn-speaker-label">
                    {turn.speaker === 'me' ? 'OP_CMD' : 'HOSTILE_INTEL'}
                </span>
              </div>
              <div className="turn-content-tactical">
                {turn.text}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .tactical-transcript-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #000000;
          padding: 10px;
        }

        .transcript-scroll {
          flex: 1;
          overflow-y: auto;
          padding-right: 10px;
        }

        .transcript-empty-tactical {
          display: flex;
          flex-direction: column;
          gap: 10px;
          color: #222222;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          margin-top: 20px;
        }

        .empty-line {
          animation: terminal-blink 2s infinite;
        }

        .tactical-turn {
          margin-bottom: 20px;
          padding: 12px;
          border-left: 2px solid transparent;
          font-family: 'Space Grotesk', sans-serif;
        }

        .turn-me {
          border-left-color: #333333;
          background: #111111;
        }

        .turn-them {
          border-left-color: #ff4545;
          background: rgba(255, 69, 69, 0.03);
        }

        .turn-metadata {
          display: flex;
          gap: 10px;
          margin-bottom: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
        }

        .turn-timestamp {
          color: #444444;
        }

        .turn-speaker-label {
          letter-spacing: 0.1em;
        }

        .turn-me .turn-speaker-label {
          color: #888888;
        }

        .turn-them .turn-speaker-label {
          color: #ff4545;
        }

        .turn-content-tactical {
          font-size: 14px;
          color: #E2E8F0;
          line-height: 1.5;
        }

        @keyframes terminal-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
