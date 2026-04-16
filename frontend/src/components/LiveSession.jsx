import { useState, useCallback } from "react";
import useSessionStore from "../store/sessionStore";
import { useSocket } from "../hooks/useSocket";
import { useSTT } from "../hooks/useSTT";
import TranscriptPanel from "./TranscriptPanel";
import WhisperCard from "./WhisperCard";
import PowerMeter from "./PowerMeter";
import TacticBadge from "./TacticBadge";
import RedFlagAlert from "./RedFlagAlert";

export default function LiveSession() {
  const addTurn = useSessionStore((s) => s.addTurn);
  const setPhase = useSessionStore((s) => s.setPhase);
  const currentWhisper = useSessionStore((s) => s.currentWhisper);
  const playbookSummary = useSessionStore((s) => s.playbookSummary);
  const behaviorMode = useSessionStore((s) => s.behaviorMode);

  const { emitThemTurn, emitMeTurn } = useSocket();

  const [speaker, setSpeaker] = useState("them");
  const [manualInput, setManualInput] = useState("");
  const [interimText, setInterimText] = useState("");

  // STT callback — fires on final transcript
  const handleTranscript = useCallback((text) => {
    if (!text.trim()) return;
    setManualInput((prev) => {
      const combined = prev ? `${prev} ${text}` : text;
      return combined;
    });
  }, []);

  const handleInterim = useCallback((text) => {
    setInterimText(text);
  }, []);

  const {
    start: startSTT,
    stop: stopSTT,
    isListening,
  } = useSTT(handleTranscript, handleInterim);

  // Submit a turn
  const handleSubmitTurn = (overrideSpeaker) => {
    const activeSpeaker = overrideSpeaker || speaker;
    const text = manualInput.trim();
    if (!text) return;

    // Add turn to local state
    addTurn({ speaker: activeSpeaker, text });

    // If speaker is "them", emit to backend for AI processing
    if (activeSpeaker === "them") {
      emitThemTurn(text);
    } else {
      // Store "me" turn in backend transcript too
      emitMeTurn(text);
    }

    setManualInput("");
    setInterimText("");
  };

  const handleSpeakerClick = (tgtSpeaker) => {
    // Check if we are switching speakers and there is pending text
    if (manualInput.trim()) {
      // The pending text belongs to the CURRENT speaker, not the one we are switching to!
      handleSubmitTurn(speaker);
    }
    // Now switch the active state for the next turn
    setSpeaker(tgtSpeaker);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitTurn();
    }
  };

  const toggleMic = () => {
    if (isListening) {
      stopSTT();
    } else {
      startSTT();
    }
  };

  const handleEndSession = () => {
    if (isListening) stopSTT();
    setPhase("report");
  };

  return (
    <div className="live-container">
      {/* Main panel — transcript + input */}
      <div className="live-main">
        {/* Red flag at top */}
        <RedFlagAlert />

        <TranscriptPanel />

        {/* Interim text indicator */}
        <div className="interim-text">
          {isListening && interimText && (
            <span>🎙️ Listening: "{interimText}"</span>
          )}
          {isListening && !interimText && <span>🎙️ Listening...</span>}
        </div>

        {/* Input bar */}
        <div className="input-bar">
          {/* Mic button */}
          <button
            className={`mic-btn ${isListening ? "listening" : ""}`}
            onClick={toggleMic}
            title={isListening ? "Stop listening" : "Start listening"}
          >
            {isListening ? "⏹" : "🎤"}
          </button>

          {/* Speaker toggle */}
          <div className="speaker-toggle">
            <button
              className={`speaker-btn ${speaker === "me" ? "active-me" : ""}`}
              onClick={() => handleSpeakerClick("me")}
            >
              Me
            </button>
            <button
              className={`speaker-btn ${
                speaker === "them" ? "active-them" : ""
              }`}
              onClick={() => handleSpeakerClick("them")}
            >
              Them
            </button>
          </div>

          {/* Text input */}
          <textarea
            className="input-bar-field"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              speaker === "them"
                ? "What did they say? (triggers AI whisper)"
                : "What did you say?"
            }
            rows={1}
          />

          {/* Send button */}
          <button
            className="btn btn-primary"
            onClick={handleSubmitTurn}
            disabled={!manualInput.trim()}
          >
            Send ↵
          </button>

          {/* End session */}
          <button className="btn btn-danger" onClick={handleEndSession}>
            End
          </button>
        </div>
      </div>

      {/* Sidebar — AI insights */}
      <div className="live-sidebar">
        <WhisperCard />

        {currentWhisper && currentWhisper.tactic && (
          <div className="card" style={{ padding: "var(--space-4)" }}>
            <div
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-text-muted)",
                marginBottom: "var(--space-2)",
                fontWeight: "var(--font-semibold)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Detected Tactic
            </div>
            <TacticBadge />
          </div>
        )}

        <PowerMeter />

        {/* Playbook summary reminder */}
        {playbookSummary && (
          <div className="card" style={{ padding: "var(--space-4)" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "var(--space-2)",
              }}
            >
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-muted)",
                  fontWeight: "var(--font-semibold)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                📋 Your Strategy
              </div>
              <div
                style={{
                  fontSize: "0.7rem",
                  padding: "2px 6px",
                  borderRadius: "12px",
                  backgroundColor: "var(--color-primary-light)",
                  color: "white",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                }}
              >
                {behaviorMode}
              </div>
            </div>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--color-text-secondary)",
                lineHeight: "var(--leading-relaxed)",
              }}
            >
              {playbookSummary.length > 200
                ? playbookSummary.slice(0, 200) + "..."
                : playbookSummary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
