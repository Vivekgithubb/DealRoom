import useSessionStore from "../store/sessionStore";

export default function WhisperCard() {
  const currentWhisper = useSessionStore((s) => s.currentWhisper);

  if (!currentWhisper) {
    return (
      <div className="card">
        <div className="whisper-empty">
          <div className="whisper-empty-icon">🤫</div>
          <p>AI Whisper</p>
          <p className="text-sm text-muted" style={{ marginTop: "4px" }}>
            Suggestions will appear here when "Them" speaks
          </p>
        </div>
      </div>
    );
  }

  const confidencePct = Math.round((currentWhisper.confidence || 0) * 100);

  return (
    <div className="whisper-card" key={Date.now()}>
      <div className="whisper-label">
        <span className="whisper-label-icon">🤫</span>
        AI WHISPER
      </div>

      <div className="whisper-suggestion">
        "{currentWhisper.suggestion}"
      </div>

      <div className="whisper-reasoning">{currentWhisper.reasoning}</div>

      <div className="whisper-confidence">
        <span>Confidence</span>
        <div className="whisper-confidence-bar">
          <div
            className="whisper-confidence-fill"
            style={{ width: `${confidencePct}%` }}
          />
        </div>
        <span>{confidencePct}%</span>
      </div>
    </div>
  );
}
