import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "../utils/apiClient";
import useSessionStore from "../store/sessionStore";
import { useSTT } from "../hooks/useSTT";
import useTTS from "../hooks/useTTS";
import { Mic, MicOff, MessageSquare, Brain, ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function PracticeSession() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const dealContext = useSessionStore((s) => s.dealContext);
  const addPracticeTurn = useSessionStore((s) => s.addPracticeTurn);
  const practiceTranscript = useSessionStore((s) => s.practiceTranscript);
  const setPhase = useSessionStore((s) => s.setPhase);
  const setReport = useSessionStore((s) => s.setReport);

  const [aiIsSpeaking, setAiIsSpeaking] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);

  const [currentSpeech, setCurrentSpeech] = useState("");
  const { speak, stop: stopTTS } = useTTS();

  // STT Hook accumulates text, but won't submit until user clicks SEND
  const { isListening, transcript, start: startSTT, stop: stopSTT } = useSTT(
    (text) => setCurrentSpeech(prev => (prev + " " + text).trim()), // onTranscript (Final Piece)
    (text) => {} // onInterim
  );
  
  const scrollRef = useRef(null);

  // Initialize Strategy & First Move
  useEffect(() => {
    const startSimulation = async () => {
      try {
        const res = await apiClient.post("/practice/start", {
          session_id: sessionId,
          ...dealContext
        });

        if (res.data.success) {
          addPracticeTurn({ speaker: "them", text: res.data.ai_text });
          setTurnCount(1);
          handleAIOffer(res.data.ai_text);
        }
      } catch (err) {
        setError("FAILED_TO_START_COMMS: " + err.message);
      } finally {
        setIsInitializing(false);
      }
    };

    startSimulation();
    return () => stopTTS();
  }, []);

  // Handle AI Text Arrival
  const handleAIOffer = (text) => {
    setAiIsSpeaking(true);
    speak(text, () => {
      setAiIsSpeaking(false);
    });
  };

  const cleanText = (text) => {
    if (!text) return "";
    return text
      .replace(/^[{"'\s]*(opening_move|negotiation_opening|dialogue|message)["'\s]*:[\s]*/i, "")
      .replace(/[}"'\s]*$/g, "")
      .trim();
  };

  // Submit User Response
  const handleSubmitResponse = useCallback(async (userText) => {
    if (!userText.trim()) return;

    stopSTT();
    addPracticeTurn({ speaker: "me", text: userText });
    
    try {
      const res = await apiClient.post("/practice/respond", {
        session_id: sessionId,
        user_message: userText
      });

      if (res.data.success) {
        addPracticeTurn({ speaker: "them", text: res.data.ai_text });
        setTurnCount(res.data.turn_count);
        handleAIOffer(res.data.ai_text);
      }
    } catch (err) {
      console.error("Simulation respond error:", err);
    }
  }, [sessionId, addPracticeTurn, handleAIOffer, stopSTT]);

  const handleManualSubmit = useCallback(() => {
    // Combine accumulated final text with the current interim transcript
    const fullText = (currentSpeech + " " + transcript).trim();
    if (fullText) {
      handleSubmitResponse(fullText);
      setCurrentSpeech("");
    } else {
      stopSTT();
    }
  }, [currentSpeech, transcript, handleSubmitResponse, stopSTT]);

  // Watch for Turn Count limits (End session at 8 turns)
  useEffect(() => {
    if (turnCount >= 8) {
       handleEndSession();
    }
  }, [turnCount]);

  const handleEndSession = async () => {
    stopTTS();
    stopSTT();
    try {
      const res = await apiClient.post("/report", { session_id: sessionId });
      setReport(res.data.report);
      setPhase("report");
    } catch (err) {
      console.error("Failed to generate practice report", err);
      setPhase("setup");
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [practiceTranscript]);

  if (isInitializing) {
    return (
      <div className="practice-loading">
        <Loader2 className="spinning" size={48} color="#DFFF00" />
        <span className="tactical-text">INITIALIZING_OPPONENT_AI...</span>
      </div>
    );
  }

  return (
    <div className="practice-container">
      <div className="practice-header">
        <div className="status-indicator">
          <div className={`status-dot ${aiIsSpeaking ? 'pulse-red' : 'pulse-green'}`}></div>
          <span className="status-label">{aiIsSpeaking ? "INCOMING_TRANSMISSION" : "YOUR_TURN"}</span>
        </div>
        <div className="turn-counter">TURN_{turnCount}/8</div>
      </div>

      <div className="practice-chat-area">
        {practiceTranscript.map((turn, i) => (
          <div key={i} className={`practice-bubble ${turn.speaker}`}>
            <div className="bubble-meta">{turn.speaker === "them" ? "THEM" : "YOU"}</div>
            <div className="bubble-text">{cleanText(turn.text)}</div>
          </div>
        ))}
        {(currentSpeech || transcript) && (
          <div className="practice-bubble me interim">
            <div className="bubble-text">{currentSpeech + " " + transcript}</div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="practice-control-bar">
        {aiIsSpeaking ? (
          <div className="ai-status">
            <Brain className="spinning" size={20} />
            <span>AI_IS_SPEAKING...</span>
          </div>
        ) : (
          <div className="user-controls">
            <div className={`voice-visualizer ${isListening ? 'active' : ''}`}>
              <Mic size={24} className={isListening ? "active-mic" : ""} />
              {isListening ? (
                <span onClick={handleManualSubmit} className="control-btn stop">STOP_&_SEND</span>
              ) : (
                <span onClick={startSTT} className="control-btn start">RE-ACTIVATE_MIC</span>
              )}
            </div>
          </div>
        )}

        <button className="abort-btn" onClick={() => setPhase("setup")}>ABORT_SIMULATION</button>
      </div>

      <style>{`
        .practice-container {
          height: calc(100vh - 80px);
          display: flex;
          flex-direction: column;
          background: #000;
          color: #fff;
          padding: 20px;
          gap: 20px;
        }

        .practice-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #1A1A1A;
          padding-bottom: 15px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .pulse-red { background: #FF3B30; animation: pulse 1s infinite; }
        .pulse-green { background: #DFFF00; animation: pulse 2s infinite; }

        @keyframes pulse {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }

        .status-label, .turn-counter {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
        }

        .practice-chat-area {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 10px;
          max-width: 600px;
          margin: 0 auto;
          width: 100%;
        }

        .practice-bubble {
          max-width: 80%;
          padding: 15px;
          border-radius: 4px;
          position: relative;
        }

        .practice-bubble.them {
          align-self: flex-start;
          background: #111;
          border-left: 4px solid #DFFF00;
        }

        .practice-bubble.me {
          align-self: flex-end;
          background: #1A1A1A;
          border-right: 4px solid #555;
          text-align: right;
        }

        .practice-bubble.interim {
          border-color: #DFFF0055;
          opacity: 0.8;
          font-style: italic;
        }

        .bubble-meta {
          font-size: 9px;
          color: #444;
          margin-bottom: 5px;
        }

        .bubble-text {
          font-size: 18px;
          line-height: 1.5;
        }

        .practice-control-bar {
          background: #0A0A0A;
          border: 1px solid #222;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .voice-visualizer {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .active-mic { color: #DFFF00; }

        .control-btn {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          color: #EEE;
          text-decoration: underline;
        }

        .abort-btn {
          background: none;
          border: 1px solid #444;
          color: #444;
          padding: 5px 12px;
          font-size: 9px;
          cursor: pointer;
        }

        .abort-btn:hover { border-color: #FF3B30; color: #FF3B30; }

        .ai-status {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #DFFF00;
        }

        .spinning { animation: spin 2s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .practice-loading {
          height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: #000;
          gap: 20px;
        }
      `}</style>
    </div>
  );
}
