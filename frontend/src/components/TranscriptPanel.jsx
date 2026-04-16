import { useRef, useEffect } from "react";
import useSessionStore from "../store/sessionStore";

export default function TranscriptPanel() {
  const transcript = useSessionStore((s) => s.transcript);
  const scrollRef = useRef(null);

  // Auto-scroll to latest turn
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
    <div className="transcript-panel card">
      <div className="transcript-header">
        <h3 className="card-title">💬 Transcript</h3>
        <span className="text-sm text-muted">
          {transcript.length} {transcript.length === 1 ? "turn" : "turns"}
        </span>
      </div>

      <div className="transcript-scroll" ref={scrollRef}>
        {transcript.length === 0 ? (
          <div className="transcript-empty">
            <div className="transcript-empty-icon">🎙️</div>
            <p>Start speaking or type below to begin the transcript.</p>
            <p className="text-sm text-muted" style={{ marginTop: "8px" }}>
              Assign each statement as "Me" or "Them"
            </p>
          </div>
        ) : (
          transcript.map((turn, i) => (
            <div key={i} className="transcript-turn">
              <div className={`turn-avatar ${turn.speaker}`}>
                {turn.speaker === "me" ? "ME" : "TH"}
              </div>
              <div className="turn-content">
                <div className={`turn-speaker ${turn.speaker}`}>
                  {turn.speaker === "me" ? "You" : "Them"}
                </div>
                <div className="turn-text">{turn.text}</div>
                <div className="turn-time">{formatTime(turn.timestamp)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
