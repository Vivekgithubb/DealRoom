import { useState } from "react";
import apiClient from "../utils/apiClient";
import useSessionStore from "../store/sessionStore";
import { ChevronDown, Shield, Lock, Terminal, Brain } from "lucide-react";
import FileUpload from "./FileUpload";
import ExtractedDataPreview from "./ExtractedDataPreview";
import "./SetupScreenStyles.css";

export default function SetupScreen() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const setDealContext = useSessionStore((s) => s.setDealContext);
  const setPlaybook = useSessionStore((s) => s.setPlaybook);
  const setPhase = useSessionStore((s) => s.setPhase);
  const setPracticeSession = useSessionStore((s) => s.setPracticeSession);
  const behaviorMode = useSessionStore((s) => s.behaviorMode);
  const setBehaviorMode = useSessionStore((s) => s.setBehaviorMode);

  const [formData, setFormData] = useState({
    deal_type: "",
    goal: "",
    walkaway: "",
    counterparty_context: "",
  });

  const [playbook, setLocalPlaybook] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showSimulator, setShowSimulator] = useState(false);
  const [simulation, setSimulation] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [practiceLoading, setPracticeLoading] = useState(false);

  const handleSimulate = async () => {
    setSimLoading(true);
    try {
      const res = await apiClient.post("/simulate", { session_id: sessionId });
      if (res.data.success) {
        setSimulation(res.data.simulation);
        setShowSimulator(true);
      }
    } catch (err) {
      console.error("Simulate error:", err);
    } finally {
      setSimLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hasFormData =
      formData.deal_type && formData.goal && formData.walkaway;
    const hasExtractedData = useSessionStore.getState().extractedData;

    if (!hasFormData && !hasExtractedData) {
      setError(
        "PLEASE PROVIDE MISSION PARAMETERS OR UPLOAD A NEGOTIATION DOCUMENT.",
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await apiClient.post("/setup", {
        ...formData,
        session_id: sessionId,
      });

      if (res.data.success) {
        setDealContext(formData);
        setPlaybook(res.data.playbook);
        setLocalPlaybook(res.data.playbook);
      } else {
        setError("FAILED TO GENERATE PLAYBOOK.");
      }
    } catch (err) {
      console.error("Setup error:", err);
      setError(err.response?.data?.error || "FAILED TO CONNECT TO SERVER.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSession = () => {
    setPhase("live");
  };

  const handleStartPractice = async () => {
    setPracticeLoading(true);
    setError(null);

    try {
      const res = await apiClient.post("/practice/start", {
        session_id: sessionId,
        deal_type: formData.deal_type,
        goal: formData.goal,
        walkaway: formData.walkaway,
      });

      if (res.data.success) {
        setPracticeSession({
          transcript: res.data.practice_transcript,
          turns: res.data.practice_turns,
          whisper: res.data.whisper,
        });
        setPhase("practice");
      } else {
        setError("FAILED TO START PRACTICE MODE.");
      }
    } catch (err) {
      console.error("Practice start error:", err);
      setError(err.response?.data?.error || "FAILED TO START PRACTICE MODE.");
    } finally {
      setPracticeLoading(false);
    }
  };

  return (
    <div className="tactical-wrapper">
      {!playbook ? (
        <div className="tactical-grid">
          {/* Left Panel */}
          <div className="tactical-left">
            <div className="phase-badge-container">
              <span className="phase-badge">PHASE_01</span>
              <span className="phase-text">PREPARATION SEQUENCE</span>
            </div>

            <h1 className="tactical-hero-title">
              READY
              <br />
              THE
              <br />
              ROOM.
            </h1>
            <p className="tactical-hero-subtitle">
              Initialize negotiation parameters. Define leverage points and
              baseline objectives before high-stakes engagement begins.
            </p>
          </div>

          {/* Right Panel */}
          <div className="tactical-right">
            <div className="mission-header">
              <Terminal className="mission-icon" size={20} strokeWidth={3} />
              <h2 className="mission-title">MISSION PARAMETERS</h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="tactical-form-grid">
                <div className="form-field">
                  <label className="tactical-label">NEGOTIATION TOPIC</label>
                  <input
                    name="deal_type"
                    className="tactical-input"
                    placeholder="E.G. Q4 CLOUD INFRASTRUCTURE RE..."
                    value={formData.deal_type}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-field">
                  <label className="tactical-label">COUNTERPARTY NAME</label>
                  <input
                    name="counterparty_context"
                    className="tactical-input"
                    placeholder="E.G. GLOBAL CORE SYSTEMS INC."
                    value={formData.counterparty_context}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-field full">
                  <FileUpload />
                  <ExtractedDataPreview />
                </div>

                <div className="form-field full">
                  <label className="tactical-label">
                    PRIMARY GOALS & LEVERAGE
                  </label>
                  <textarea
                    name="goal"
                    className="tactical-input"
                    placeholder="LIST KEY OBJECTIVES, MAXIMUM BUDGET, AND CRITICAL DEAL-BREAKERS..."
                    value={formData.goal}
                    onChange={handleChange}
                    style={{ minHeight: "80px" }}
                  />
                </div>

                <div className="form-field full">
                  <label className="tactical-label">BASELINE & WALKAWAY</label>
                  <textarea
                    name="walkaway"
                    className="tactical-input"
                    placeholder="ENTER YOUR MINIMUM ACCEPTABLE OUTCOME..."
                    value={formData.walkaway}
                    onChange={handleChange}
                    style={{ minHeight: "80px" }}
                  />
                </div>
              </div>

              {error && (
                <div className="tactical-alert">[!] ERROR: {error}</div>
              )}

              <div className="tactical-actions">
                <button
                  type="submit"
                  className="tactical-submit-btn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="loading-text">INITIALIZING...</span>
                  ) : (
                    "START SESSION"
                  )}
                </button>

                <div className="tactical-footer-info">
                  <div className="lock-icons">
                    <Shield size={16} />
                    <Lock size={16} />
                  </div>
                  <span className="footer-text">
                    SECURE TACTICAL ENVIRONMENT ACTIVE
                  </span>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="tactical-playbook">
          <div className="playbook-header">STRATEGY DEPLOYED.</div>

          <div className="playbook-section">
            <h3 className="playbook-section-title">EXECUTIVE SUMMARY</h3>
            <p className="playbook-text">{playbook.playbook_summary}</p>
          </div>

          <div className="playbook-section">
            <h3 className="playbook-section-title">PHASE 0: OPENING MOVE</h3>
            <p className="playbook-text">{playbook.opening_move}</p>
          </div>

          <div className="playbook-section">
            <h3 className="playbook-section-title">LEVERAGE ACQUIRED</h3>
            <ul className="tactical-list">
              {playbook.key_leverage?.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="playbook-section">
            <h3 className="playbook-section-title">RED LINES [DO NOT CROSS]</h3>
            <ul className="tactical-list red-lines">
              {playbook.red_lines?.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Simulator Section */}
          {showSimulator && simulation && (
            <div
              style={{
                marginTop: "40px",
                borderTop: "2px solid #262626",
                paddingTop: "40px",
              }}
            >
              <SimulatorInline
                simulation={simulation}
                selectedMode={behaviorMode}
                onSelectMode={(mode) => setBehaviorMode(mode)}
              />
            </div>
          )}

          <div
            className="tactical-actions"
            style={{ marginTop: "40px", flexWrap: "wrap" }}
          >
            {!showSimulator ? (
              <>
                <button
                  className="tactical-submit-btn"
                  onClick={handleSimulate}
                  disabled={simLoading}
                >
                  {simLoading ? (
                    <span className="loading-text">CALCULATING PATHS...</span>
                  ) : (
                    "SIMULATE OUTCOMES"
                  )}
                </button>
                <button
                  className="tactical-submit-btn"
                  onClick={handleStartPractice}
                  disabled={practiceLoading}
                  style={{ backgroundColor: "#FFFFFF", color: "#111111" }}
                >
                  {practiceLoading ? (
                    <span className="loading-text">STARTING PRACTICE...</span>
                  ) : (
                    "ENTER PRACTICE MODE"
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  className="tactical-submit-btn"
                  onClick={handleStartSession}
                >
                  PROCEED TO ENGAGEMENT [MODE: {behaviorMode.toUpperCase()}]
                </button>
                <button
                  className="tactical-submit-btn"
                  onClick={handleStartPractice}
                  disabled={practiceLoading}
                  style={{ backgroundColor: "#FFFFFF", color: "#111111" }}
                >
                  {practiceLoading ? (
                    <span className="loading-text">STARTING PRACTICE...</span>
                  ) : (
                    "PRACTICE THIS SCENARIO"
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Inline simulator component
function SimulatorInline({ simulation, selectedMode, onSelectMode }) {
  const riskColors = {
    low: "#DFFF00",
    medium: "#FFA500",
    high: "#FF4545",
  };

  return (
    <div>
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "24px",
          letterSpacing: "0.05em",
          color: "#FFFFFF",
          marginBottom: "20px",
          textAlign: "center",
        }}
      >
        SELECT ENGAGEMENT PROTOCOL
      </h3>

      <div className="tactical-simulator-grid">
        {simulation.paths?.map((path) => {
          const isSelected =
            selectedMode === path.strategy ||
            (selectedMode === "defensive" && path.strategy === "conservative");
          const modeVal =
            path.strategy === "conservative" ? "defensive" : path.strategy;

          return (
            <div
              key={path.strategy}
              className={`tactical-sim-card ${isSelected ? "selected" : ""}`}
              onClick={() => onSelectMode(modeVal)}
              style={{
                borderColor: isSelected
                  ? riskColors[path.risk_level]
                  : "#262626",
                borderWidth: isSelected ? "2px" : "1px",
              }}
            >
              <div
                className="sim-strategy-type"
                style={{ color: riskColors[path.risk_level] }}
              >
                {modeVal.toUpperCase()}
              </div>
              <div className="sim-path-label">{path.label}</div>
              <p className="sim-path-desc">{path.description}</p>

              <div className="sim-stat-row">
                <span className="sim-stat-label">SUCCESS PROBABILITY</span>
                <span
                  className="sim-stat-value"
                  style={{ color: riskColors[path.risk_level] }}
                >
                  {path.probability_of_success}%
                </span>
              </div>

              {path.predicted_price && (
                <div
                  className="sim-stat-row"
                  style={{
                    marginTop: "10px",
                    borderTop: "1px solid #1A1A1A",
                    paddingTop: "10px",
                  }}
                >
                  <span className="sim-stat-label">PREDICTED_SETTLEMENT</span>
                  <span
                    className="sim-stat-value"
                    style={{ color: "#FFFFFF", fontSize: "14px" }}
                  >
                    {path.predicted_price}
                  </span>
                </div>
              )}

              <div className="sim-stat-bar">
                <div
                  className="sim-stat-fill"
                  style={{
                    width: `${path.probability_of_success}%`,
                    backgroundColor: riskColors[path.risk_level],
                  }}
                />
              </div>

              <div className="sim-tradeoff">
                <span className="sim-stat-label">TRADEOFF: </span>
                {path.tradeoff}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
