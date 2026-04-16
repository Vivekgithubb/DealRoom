import { useState } from "react";
import useSessionStore from "../store/sessionStore";

export default function RedFlagAlert() {
  const currentWhisper = useSessionStore((s) => s.currentWhisper);
  const [dismissed, setDismissed] = useState(false);
  const [lastWhisperKey, setLastWhisperKey] = useState(null);

  // Reset dismissed state when a new whisper arrives
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
    <div className="red-flag-alert">
      <span className="red-flag-icon">🚩</span>
      <span className="red-flag-text">
        Red Flag Detected — They may be using pressure tactics. Stay calm and don't rush your response.
      </span>
      <button
        className="red-flag-dismiss"
        onClick={() => setDismissed(true)}
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
