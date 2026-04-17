export default function PracticeChat({ transcript, interimText, isPending }) {
  const formatTime = (timestamp) => {
    const value = timestamp ? new Date(timestamp) : new Date();
    return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="practice-chat-shell">
      <div className="practice-chat-scroll">
        {transcript.length === 0 ? (
          <div className="practice-chat-empty">
            <div>_ PRACTICE CHANNEL STANDBY</div>
            <div>_ WAITING FOR COUNTERPART TO OPEN</div>
          </div>
        ) : (
          transcript.map((turn, index) => (
            <div
              key={`${turn.speaker}-${turn.timestamp || index}`}
              className={`practice-turn ${turn.speaker === "me" ? "practice-turn-me" : "practice-turn-them"}`}
            >
              <div className="practice-turn-meta">
                <span>[{formatTime(turn.timestamp)}]</span>
                <span>{turn.speaker === "me" ? "YOU" : "AI COUNTERPART"}</span>
              </div>
              <div className="practice-turn-text">{turn.text}</div>
            </div>
          ))
        )}

        {interimText && (
          <div className="practice-interim-bubble">
            <div className="practice-turn-meta">
              <span>[LIVE]</span>
              <span>VOICE CAPTURE</span>
            </div>
            <div className="practice-turn-text">{interimText}</div>
          </div>
        )}

        {isPending && (
          <div className="practice-typing">
            <span className="practice-dot"></span>
            <span className="practice-dot"></span>
            <span className="practice-dot"></span>
            <span>AI COUNTERPART IS THINKING</span>
          </div>
        )}
      </div>
    </div>
  );
}
