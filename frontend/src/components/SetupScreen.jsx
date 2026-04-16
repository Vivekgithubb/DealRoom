import { useState } from "react";
import apiClient from "../utils/apiClient";
import useSessionStore from "../store/sessionStore";

export default function SetupScreen() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const setDealContext = useSessionStore((s) => s.setDealContext);
  const setPlaybook = useSessionStore((s) => s.setPlaybook);
  const setPhase = useSessionStore((s) => s.setPhase);
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

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.deal_type || !formData.goal || !formData.walkaway) {
      setError("Please fill in all required fields.");
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
        setError("Failed to generate playbook.");
      }
    } catch (err) {
      console.error("Setup error:", err);
      setError(err.response?.data?.error || "Failed to connect to server.");
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleStartSession = () => {
    setPhase("live");
  };

  return (
    <div className="setup-container">
      <div className="setup-hero">
        <h1 className="setup-hero-title">Prepare Your Strategy</h1>
        <p className="setup-hero-subtitle">
          Enter your deal context below. Our AI strategist will generate a
          tailored playbook before you begin.
        </p>
      </div>

      {!playbook ? (
        <form className="setup-form" onSubmit={handleSubmit}>
          <div className="card" style={{ animationDelay: "0.1s" }}>
            <div className="input-group">
              <label className="input-label" htmlFor="deal_type">
                Deal Type *
              </label>
              <input
                id="deal_type"
                name="deal_type"
                className="input-field"
                placeholder="e.g., Salary negotiation, Vendor contract, Real estate deal"
                value={formData.deal_type}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="card" style={{ animationDelay: "0.2s" }}>
            <div className="input-group">
              <label className="input-label" htmlFor="goal">
                Your Goal *
              </label>
              <textarea
                id="goal"
                name="goal"
                className="input-field"
                placeholder="What do you want to achieve? Be specific about your ideal outcome."
                value={formData.goal}
                onChange={handleChange}
                rows={3}
                required
              />
            </div>
          </div>

          <div className="card" style={{ animationDelay: "0.3s" }}>
            <div className="input-group">
              <label className="input-label" htmlFor="walkaway">
                Walkaway Point *
              </label>
              <textarea
                id="walkaway"
                name="walkaway"
                className="input-field"
                placeholder="What's the minimum outcome you'll accept? Below this, you walk away."
                value={formData.walkaway}
                onChange={handleChange}
                rows={2}
                required
              />
            </div>
          </div>

          <div className="card" style={{ animationDelay: "0.4s" }}>
            <div className="input-group">
              <label className="input-label" htmlFor="counterparty_context">
                Counterparty Context (Optional)
              </label>
              <textarea
                id="counterparty_context"
                name="counterparty_context"
                className="input-field"
                placeholder="Who are you negotiating with? Any background info on their position, style, or constraints?"
                value={formData.counterparty_context}
                onChange={handleChange}
                rows={3}
              />
            </div>
          </div>

          {error && (
            <div className="red-flag-alert">
              <span className="red-flag-icon">⚠️</span>
              <span className="red-flag-text">{error}</span>
            </div>
          )}

          <div className="setup-actions">
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Generating Playbook...
                </>
              ) : (
                "🎯 Generate Playbook"
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="playbook-container">
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">📋 Your Playbook</h2>
                <p className="card-subtitle">
                  AI-generated strategy for your negotiation
                </p>
              </div>
            </div>

            <div className="playbook-section">
              <h3 className="playbook-section-title">Strategy Summary</h3>
              <p className="playbook-text">{playbook.playbook_summary}</p>
            </div>

            <div className="playbook-section">
              <h3 className="playbook-section-title">🎬 Opening Move</h3>
              <p className="playbook-text">{playbook.opening_move}</p>
            </div>

            <div className="playbook-section">
              <h3 className="playbook-section-title">💪 Key Leverage Points</h3>
              <ul className="playbook-list">
                {playbook.key_leverage?.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="playbook-section">
              <h3 className="playbook-section-title">🚫 Red Lines</h3>
              <ul className="playbook-list red-lines">
                {playbook.red_lines?.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Simulator Section */}
          {showSimulator && simulation && (
            <div style={{ marginTop: "var(--space-6)" }}>
              <SimulatorInline 
                simulation={simulation} 
                selectedMode={behaviorMode}
                onSelectMode={(mode) => setBehaviorMode(mode)}
              />
            </div>
          )}

          <div className="setup-actions" style={{ marginTop: "32px" }}>
            <button
              className="btn btn-secondary btn-lg"
              onClick={handleSimulate}
              disabled={simLoading}
            >
              {simLoading ? (
                <>
                  <span className="spinner"></span>
                  Simulating...
                </>
              ) : (
                "🔮 Simulate Outcomes"
              )}
            </button>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
              <div style={{ fontWeight: "bold", color: "var(--color-primary)", marginBottom: "8px" }}>
                Active Style: {behaviorMode.toUpperCase()}
              </div>
              <button
                className="btn btn-success btn-lg"
                onClick={handleStartSession}
              >
                🎤 Start Live Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline simulator component
function SimulatorInline({ simulation, selectedMode, onSelectMode }) {
  const riskColors = {
    low: "var(--color-success)",
    medium: "var(--color-warning)",
    high: "var(--color-danger)",
  };

  return (
    <div>
      <h3
        className="text-center"
        style={{
          fontSize: "var(--text-xl)",
          fontWeight: "var(--font-bold)",
          marginBottom: "var(--space-2)",
        }}
      >
        🔮 Outcome Predictions
      </h3>
      <p
        className="text-center text-muted"
        style={{ marginBottom: "var(--space-6)" }}
      >
        Three possible paths for your negotiation
      </p>

      <div className="simulator-grid">
        {simulation.paths?.map((path) => {
          // Map "conservative" to "defensive" for UI if necessary, though paths return "conservative"
          const isSelected = selectedMode === path.strategy || (selectedMode === "defensive" && path.strategy === "conservative");
          return (
            <div
              key={path.strategy}
              className={`sim-card ${path.strategy}`}
              onClick={() => onSelectMode(path.strategy === "conservative" ? "defensive" : path.strategy)}
              style={{
                cursor: "pointer",
                outline: isSelected ? "3px solid var(--color-primary)" : "none",
                transform: isSelected ? "scale(1.02)" : "scale(1)",
                transition: "all 0.2s ease"
              }}
            >
              <div className="sim-card-strategy">
                {path.strategy === "conservative" ? "defensive" : path.strategy}
                {isSelected && " (Selected)"}
              </div>
            <div className="sim-card-label">{path.label}</div>
            <div className="sim-card-description">{path.description}</div>

            <div className="sim-card-outcome">
              <strong style={{ color: "var(--color-text-primary)" }}>
                Expected:{" "}
              </strong>
              {path.expected_outcome}
            </div>

            <div className="sim-card-meta">
              <div className="sim-meta-row">
                <span className="sim-meta-label">Success</span>
                <span
                  className="sim-meta-value"
                  style={{ color: riskColors[path.risk_level] }}
                >
                  {path.probability_of_success}%
                </span>
              </div>
              <div className="sim-meta-row">
                <span className="sim-meta-label">Risk</span>
                <span
                  className="sim-meta-value"
                  style={{
                    color: riskColors[path.risk_level],
                    textTransform: "capitalize",
                  }}
                >
                  {path.risk_level}
                </span>
              </div>
            </div>

            <div className="sim-probability-bar">
              <div
                className="sim-probability-fill"
                style={{ width: `${path.probability_of_success}%` }}
              />
            </div>

            <div className="sim-tradeoff">
              <strong>Tradeoff: </strong>
              {path.tradeoff}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
