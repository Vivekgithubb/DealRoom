import { useState, useCallback } from "react";
import useSessionStore from "../store/sessionStore";
import { useSocket } from "../hooks/useSocket";
import { useSTT } from "../hooks/useSTT";
import TranscriptPanel from "./TranscriptPanel";
import WhisperCard from "./WhisperCard";
import PowerMeter from "./PowerMeter";
import TacticBadge from "./TacticBadge";
import RedFlagAlert from "./RedFlagAlert";
import "./LiveSessionStyles.css";

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

  const handleSubmitTurn = (overrideSpeaker) => {
    const activeSpeaker = overrideSpeaker || speaker;
    const text = manualInput.trim();
    if (!text) return;

    addTurn({ speaker: activeSpeaker, text });

    if (activeSpeaker === "them") {
      emitThemTurn(text);
    } else {
      emitMeTurn(text);
    }

    setManualInput("");
    setInterimText("");
  };

  const handleSpeakerClick = (tgtSpeaker) => {
    if (manualInput.trim()) {
      handleSubmitTurn(speaker);
    }
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
      {/* Main panel */}
      <div className="live-main">
        <RedFlagAlert />

        <div className="transcript-panel">
          <div className="transcript-header">
            <span>_ TRANSCRIPT FEED</span>
            <span>SECURE LINK ACTIVE</span>
          </div>
          <TranscriptPanel />
        </div>

        {isListening && (
          <div className="interim-text">
            [ MIC ] {interimText ? interimText : 'AWAITING AUDIO INPUT...'}
          </div>
        )}

        <div className="tactical-input-bar">
          <button
            className={`mic-btn-tactical ${isListening ? "listening" : ""}`}
            onClick={toggleMic}
            title={isListening ? "DEACTIVATE MIC" : "ACTIVATE MIC"}
          >
            {isListening ? "⏹" : "🎤"}
          </button>

          <div className="speaker-toggle-tactical">
            <button
              className={`speaker-btn-tactical ${speaker === "me" ? "active-me" : ""}`}
              onClick={() => handleSpeakerClick("me")}
            >
              OP (ME)
            </button>
            <button
              className={`speaker-btn-tactical ${speaker === "them" ? "active-them" : ""}`}
              onClick={() => handleSpeakerClick("them")}
            >
              HOSTILE (THEM)
            </button>
          </div>

          <textarea
            className="tactical-input-bar-field"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              speaker === "them"
                ? "LOG HOSTILE TRANSMISSION..."
                : "LOG OP TRANSMISSION..."
            }
            rows={1}
          />

          <button
            className="btn btn-primary"
            onClick={() => handleSubmitTurn()}
            disabled={!manualInput.trim()}
          >
            SEND
          </button>

          <button className="btn btn-danger" onClick={handleEndSession}>
            SUBMIT
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="live-sidebar">

        <div style={{ pointerEvents: 'none' }}>
          <WhisperCard />
        </div>

        {currentWhisper && currentWhisper.tactic && (
          <div className="tactical-sidebar-card">
            <div className="tactical-sidebar-header">
              HOSTILE TACTIC DETECTED
            </div>
            <TacticBadge />
          </div>
        )}

        <div className="tactical-sidebar-card">
          <div className="tactical-sidebar-header">
            POWER BALANCE
          </div>
          <PowerMeter />
        </div>

        {playbookSummary && (
          <div className="tactical-sidebar-card">
            <div className="tactical-sidebar-header">
              <span>STRATEGY OVERVIEW</span>
              <span className="tactical-mode-badge">{behaviorMode}</span>
            </div>
            <p style={{
              fontFamily: 'Space Grotesk',
              fontSize: '13px',
              color: '#cccccc',
              lineHeight: '1.5'
            }}>
              {playbookSummary.length > 250
                ? playbookSummary.slice(0, 250) + "..."
                : playbookSummary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
