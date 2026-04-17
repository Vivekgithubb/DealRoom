import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Brain,
  Mic,
  MicOff,
  RefreshCcw,
  Send,
  ShieldAlert,
  Target,
  Volume2,
  VolumeX,
} from "lucide-react";
import apiClient from "../utils/apiClient";
import useSessionStore from "../store/sessionStore";
import { useSTT } from "../hooks/useSTT";
import { TACTIC_LABELS } from "../contracts";
import PracticeChat from "./PracticeChat";
import VoicePlayer from "./VoicePlayer";
import "./PracticeModeStyles.css";

const MIN_PRACTICE_TURNS = 6;
const VOICE_ECHO_COOLDOWN_MS = 1200;

export default function PracticeMode() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const dealContext = useSessionStore((s) => s.dealContext);
  const playbookSummary = useSessionStore((s) => s.playbookSummary);
  const practiceTranscript = useSessionStore((s) => s.practiceTranscript);
  const practiceTurns = useSessionStore((s) => s.practiceTurns);
  const practiceReport = useSessionStore((s) => s.practiceReport);
  const practiceCurrentWhisper = useSessionStore((s) => s.practiceCurrentWhisper);
  const setPracticeSession = useSessionStore((s) => s.setPracticeSession);
  const setPracticeReport = useSessionStore((s) => s.setPracticeReport);
  const resetPracticeSession = useSessionStore((s) => s.resetPracticeSession);
  const setPhase = useSessionStore((s) => s.setPhase);
  const resetSession = useSessionStore((s) => s.resetSession);

  const [manualInput, setManualInput] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [voiceLine, setVoiceLine] = useState("");
  const [speakToken, setSpeakToken] = useState(0);
  const lastSpokenKeyRef = useRef(null);
  const lastVoiceEndedAtRef = useRef(0);
  const lastAiLineRef = useRef("");

  const handleTranscript = useCallback((text) => {
    if (!text.trim()) return;

    const msSinceVoiceEnded = Date.now() - lastVoiceEndedAtRef.current;
    if (msSinceVoiceEnded >= 0 && msSinceVoiceEnded < VOICE_ECHO_COOLDOWN_MS) {
      if (isLikelyVoiceEcho(text, lastAiLineRef.current)) {
        setError("VOICE ECHO FILTERED. WAIT A BEAT AFTER THE AI STOPS SPEAKING, THEN TRY AGAIN.");
        return;
      }
    }

    setManualInput((prev) => (prev ? `${prev} ${text}` : text));
  }, []);

  const handleInterim = useCallback((text) => {
    setInterimText(text);
  }, []);

  const { start: startSTT, stop: stopSTT, isListening } = useSTT(handleTranscript, handleInterim);

  const handleVoiceStart = useCallback(() => {
    if (isListening) {
      stopSTT();
    }
    setAiSpeaking(true);
  }, [isListening, stopSTT]);

  const handleVoiceEnd = useCallback(() => {
    lastVoiceEndedAtRef.current = Date.now();
    setAiSpeaking(false);
  }, []);

  useEffect(() => {
    if (!practiceReport && practiceTranscript.length === 0) {
      startPractice();
    }
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const lastTurn = practiceTranscript[practiceTranscript.length - 1];
    if (!lastTurn || lastTurn.speaker !== "them") {
      return;
    }

    lastAiLineRef.current = lastTurn.text;
    const lastKey = `${practiceTurns}-${lastTurn.text}`;
    if (lastSpokenKeyRef.current === lastKey) {
      return;
    }

    lastSpokenKeyRef.current = lastKey;
    setVoiceLine(lastTurn.text);
    setSpeakToken((prev) => prev + 1);
  }, [practiceTranscript, practiceTurns]);

  async function startPractice() {
    setIsPending(true);
    setError(null);

    try {
      const res = await apiClient.post("/practice/start", {
        session_id: sessionId,
        deal_type: dealContext?.deal_type,
        goal: dealContext?.goal,
        walkaway: dealContext?.walkaway,
      });

      if (res.data.success) {
        setPracticeSession({
          transcript: res.data.practice_transcript,
          turns: res.data.practice_turns,
          whisper: res.data.whisper,
        });
      } else {
        setError("FAILED TO START PRACTICE DRILL.");
      }
    } catch (err) {
      console.error("Practice bootstrap error:", err);
      setError(err.response?.data?.error || "FAILED TO START PRACTICE DRILL.");
    } finally {
      setIsPending(false);
    }
  }

  async function submitResponse() {
    const userMessage = manualInput.trim();
    if (!userMessage || isPending || isGeneratingReport) {
      return;
    }

    setIsPending(true);
    setError(null);
    setInterimText("");
    stopSTT();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setAiSpeaking(false);

    try {
      const res = await apiClient.post("/practice/respond", {
        session_id: sessionId,
        user_message: userMessage,
      });

      if (res.data.success) {
        setPracticeSession({
          transcript: res.data.practice_transcript,
          turns: res.data.practice_turns,
          whisper: res.data.whisper,
        });
        setManualInput("");

        if (res.data.session_complete) {
          await generatePracticeReport();
        }
      } else {
        setError("FAILED TO CONTINUE PRACTICE DRILL.");
      }
    } catch (err) {
      console.error("Practice response error:", err);
      setError(err.response?.data?.error || "FAILED TO CONTINUE PRACTICE DRILL.");
    } finally {
      setIsPending(false);
    }
  }

  async function generatePracticeReport() {
    setIsGeneratingReport(true);
    setError(null);
    stopSTT();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setAiSpeaking(false);

    try {
      const res = await apiClient.post("/practice/report", {
        session_id: sessionId,
      });

      if (res.data.success) {
        setPracticeReport(res.data.report);
      } else {
        setError("FAILED TO GENERATE PRACTICE REPORT.");
      }
    } catch (err) {
      console.error("Practice report error:", err);
      setError(err.response?.data?.error || "FAILED TO GENERATE PRACTICE REPORT.");
    } finally {
      setIsGeneratingReport(false);
    }
  }

  function toggleMic() {
    if (isPending || aiSpeaking || isGeneratingReport) {
      return;
    }

    const msSinceVoiceEnded = Date.now() - lastVoiceEndedAtRef.current;
    if (msSinceVoiceEnded >= 0 && msSinceVoiceEnded < VOICE_ECHO_COOLDOWN_MS) {
      setError("WAIT FOR THE AI AUDIO TO CLEAR BEFORE STARTING THE MIC.");
      return;
    }

    if (isListening) {
      stopSTT();
      return;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setAiSpeaking(false);
    startSTT();
  }

  function exitToSetup() {
    stopSTT();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    resetPracticeSession();
    setManualInput("");
    setInterimText("");
    setPhase("setup");
  }

  function startNewSession() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    resetSession();
  }

  const canEnd = practiceTurns >= MIN_PRACTICE_TURNS && !practiceReport;
  const tacticLabel =
    practiceCurrentWhisper?.tactic && practiceCurrentWhisper.tactic !== "null"
      ? TACTIC_LABELS[practiceCurrentWhisper.tactic] || practiceCurrentWhisper.tactic
      : "No clear tactic";

  if (practiceReport) {
    return (
      <div className="practice-report">
        <div className="practice-badge">PRACTICE_DEBRIEF</div>
        <div className="practice-title">TRAINING<br />REPORT</div>
        <p className="practice-subtitle">
          Detailed review of the pressure drill, the tactics used against you, and the fastest ways to sharpen your negotiation response under pressure.
        </p>

        <div className="practice-report-grid">
          <div className="practice-report-card">
            <div className="practice-card-header">PRACTICE SCORE</div>
            <div className="practice-report-score">{practiceReport.practice_score ?? 0}</div>
            <div className="practice-card-subtle" style={{ marginTop: "12px" }}>
              {practiceReport.drill_recommendation}
            </div>
          </div>

          <div className="practice-report-card">
            <div className="practice-card-header">SESSION SUMMARY</div>
            <div className="practice-card-text">{practiceReport.summary}</div>
          </div>

          <div className="practice-report-card">
            <div className="practice-card-header">WHAT YOU DID WELL</div>
            <ul className="practice-report-list">
              {(practiceReport.strengths || []).map((item, index) => (
                <li key={`strength-${index}`}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="practice-report-card">
            <div className="practice-card-header">WHERE YOU GOT HIT</div>
            <ul className="practice-report-list">
              {(practiceReport.mistakes || []).map((item, index) => (
                <li key={`mistake-${index}`}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="practice-report-card">
            <div className="practice-card-header">MISSED WINDOWS</div>
            <ul className="practice-report-list">
              {(practiceReport.missed_opportunities || []).map((item, index) => (
                <li key={`opportunity-${index}`}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="practice-report-card">
            <div className="practice-card-header">TACTICS USED AGAINST YOU</div>
            <ul className="practice-report-list">
              {(practiceReport.detected_tactics || []).map((item, index) => (
                <li key={`tactic-${index}`}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="practice-report-card">
            <div className="practice-card-header">IMPROVEMENT PLAN</div>
            <ul className="practice-report-list">
              {(practiceReport.improvement_plan || []).map((item, index) => (
                <li key={`plan-${index}`}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="practice-report-card">
            <div className="practice-card-header">STYLE ANALYSIS</div>
            <div className="practice-card-text">{practiceReport.negotiation_style}</div>
          </div>
        </div>

        <div className="practice-report-actions">
          <button className="practice-primary-btn" onClick={exitToSetup}>
            <ArrowLeft size={14} /> RETURN TO SETUP
          </button>
          <button className="practice-secondary-btn" onClick={startNewSession}>
            <RefreshCcw size={14} /> NEW SESSION
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="practice-mode">
      <VoicePlayer
        text={voiceLine}
        speakToken={speakToken}
        enabled={voiceEnabled}
        onStart={handleVoiceStart}
        onEnd={handleVoiceEnd}
      />

      <div className="practice-main">
        <div className="practice-header">
          <div>
            <div className="practice-badge">PRACTICE_MODE</div>
            <div className="practice-title">PRESSURE<br />DRILL</div>
            <p className="practice-subtitle">
              Train against an AI negotiator that speaks naturally, pressures your position, and coaches you after every exchange. Scenario:{" "}
              {dealContext?.deal_type || "Negotiation training"}.
            </p>
          </div>

          <div className="practice-header-actions">
            <button
              className={`practice-chip ${voiceEnabled ? "active" : ""}`}
              onClick={() => setVoiceEnabled((prev) => !prev)}
              type="button"
            >
              {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              {voiceEnabled ? "VOICE ON" : "VOICE OFF"}
            </button>
            <button className="practice-chip" onClick={exitToSetup} type="button">
              <ArrowLeft size={14} />
              BACK TO SETUP
            </button>
          </div>
        </div>

        {error && <div className="practice-alert" style={{ margin: "24px 24px 0 24px" }}>{error}</div>}

        <PracticeChat
          transcript={practiceTranscript}
          interimText={interimText}
          isPending={isPending}
        />

        <div className="practice-input-bar">
          <button
            className={`practice-mic-btn ${isListening ? "listening" : ""}`}
            onClick={toggleMic}
            disabled={isPending || aiSpeaking || isGeneratingReport}
            type="button"
            title={isListening ? "Stop voice capture" : "Start voice capture"}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <textarea
            className="practice-input"
            value={manualInput}
            onChange={(event) => setManualInput(event.target.value)}
            placeholder="Type or dictate your response..."
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitResponse();
              }
            }}
          />

          <button
            className="practice-send-btn"
            onClick={submitResponse}
            disabled={!manualInput.trim() || isPending || isGeneratingReport}
            type="button"
          >
            <Send size={14} /> SEND
          </button>

          <button
            className="practice-finish-btn"
            onClick={generatePracticeReport}
            disabled={!canEnd || isGeneratingReport}
            type="button"
          >
            {isGeneratingReport ? "BUILDING REPORT..." : "END DRILL"}
          </button>
        </div>
      </div>

      <aside className="practice-sidebar">
        <div className="practice-card">
          <div className="practice-card-header">
            <span>SESSION STATUS</span>
            <span className="practice-risk">{aiSpeaking ? "AI SPEAKING" : isListening ? "LISTENING" : "READY"}</span>
          </div>
          <div className="practice-stats">
            <div className="practice-stat">
              <div className="practice-stat-label">AI ROUNDS</div>
              <div className="practice-stat-value">{practiceTurns}</div>
            </div>
            <div className="practice-stat">
              <div className="practice-stat-label">REPORT READY</div>
              <div className="practice-stat-value">{practiceTurns >= MIN_PRACTICE_TURNS ? "YES" : "NO"}</div>
            </div>
          </div>
        </div>

        <div className="practice-card">
          <div className="practice-card-header">
            <span>COACH FEED</span>
            <Brain size={14} color="#dfff00" />
          </div>
          <div className="practice-tactic">{tacticLabel.toUpperCase()}</div>
          <div className="practice-card-title">
            {practiceCurrentWhisper?.suggestion || "Hold your frame"}
          </div>
          <div className="practice-card-text" style={{ marginTop: "12px" }}>
            {practiceCurrentWhisper?.script || "Use one calm, specific sentence before conceding anything."}
          </div>
          <div className="practice-card-subtle" style={{ marginTop: "12px" }}>
            {practiceCurrentWhisper?.reasoning || "Coaching will update after each AI counter move."}
          </div>
        </div>

        <div className="practice-card">
          <div className="practice-card-header">
            <span>TACTICAL RISK</span>
            <ShieldAlert size={14} color={practiceCurrentWhisper?.red_flag ? "#ff4545" : "#dfff00"} />
          </div>
          <div className="practice-card-title">
            {practiceCurrentWhisper?.risk_score || "Moderate"}
          </div>
          <div className="practice-card-text" style={{ marginTop: "12px" }}>
            Sentiment: {practiceCurrentWhisper?.sentiment || "Neutral"}<br />
            Confidence: {Math.round((practiceCurrentWhisper?.confidence || 0) * 100)}%
          </div>
          {practiceCurrentWhisper?.red_flag && (
            <div className="practice-alert" style={{ marginTop: "14px" }}>
              Pressure detected. Slow the pace and force specificity before you move.
            </div>
          )}
        </div>

        <div className="practice-card">
          <div className="practice-card-header">
            <span>SCENARIO BRIEF</span>
            <Target size={14} color="#dfff00" />
          </div>
          <div className="practice-card-text">
            Goal: {dealContext?.goal || "Use the generated strategy to defend value."}
          </div>
          <div className="practice-card-subtle" style={{ marginTop: "12px" }}>
            Walkaway: {dealContext?.walkaway || "Protect your minimum acceptable outcome."}
          </div>
          {playbookSummary && (
            <div className="practice-card-subtle" style={{ marginTop: "12px" }}>
              {playbookSummary.length > 220 ? `${playbookSummary.slice(0, 220)}...` : playbookSummary}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function isLikelyVoiceEcho(candidate, aiLine) {
  const normalizedCandidate = normalizeSpeech(candidate);
  const normalizedAiLine = normalizeSpeech(aiLine);

  if (!normalizedCandidate || !normalizedAiLine) {
    return false;
  }

  if (normalizedAiLine.includes(normalizedCandidate)) {
    return true;
  }

  const candidateWords = normalizedCandidate.split(" ");
  const aiWords = new Set(normalizedAiLine.split(" "));
  const overlapCount = candidateWords.filter((word) => aiWords.has(word)).length;

  return candidateWords.length >= 3 && overlapCount / candidateWords.length >= 0.7;
}

function normalizeSpeech(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
