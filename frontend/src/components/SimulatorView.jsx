import { useState } from "react";
import apiClient from "../utils/apiClient";
import useSessionStore from "../store/sessionStore";

export default function SimulatorView() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const simulation = useSessionStore((s) => s.simulation);
  const setSimulation = useSessionStore((s) => s.setSimulation);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSimulate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.post("/simulate", { session_id: sessionId });
      if (res.data.success) {
        setSimulation(res.data.simulation);
      } else {
        setError("Failed to generate simulation.");
      }
    } catch (err) {
      console.error("Simulate error:", err);
      setError(err.response?.data?.error || "Failed to generate simulation.");
    } finally {
      setIsLoading(false);
    }
  };

  const riskColors = {
    low: "var(--color-success)",
    medium: "var(--color-warning)",
    high: "var(--color-danger)",
  };

  return (
    <div className="simulator-container">
      <h2 className="simulator-title">🔮 Outcome Simulator</h2>
      <p className="simulator-subtitle">
        AI-predicted paths based on your deal context
      </p>

      {!simulation && (
        <div className="text-center">
          <button
            className="btn btn-primary btn-lg"
            onClick={handleSimulate}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Simulating...
              </>
            ) : (
              "Run Simulation"
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="red-flag-alert" style={{ marginTop: "16px" }}>
          <span className="red-flag-icon">⚠️</span>
          <span className="red-flag-text">{error}</span>
        </div>
      )}

      {simulation && simulation.paths && (
        <div className="simulator-grid">
          {simulation.paths.map((path) => (
            <div
              key={path.strategy}
              className={`sim-card ${path.strategy}`}
            >
              <div className="sim-card-strategy">{path.strategy}</div>
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
                  <span className="sim-meta-label">Success Probability</span>
                  <span
                    className="sim-meta-value"
                    style={{ color: riskColors[path.risk_level] }}
                  >
                    {path.probability_of_success}%
                  </span>
                </div>
                <div className="sim-meta-row">
                  <span className="sim-meta-label">Risk Level</span>
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
          ))}
        </div>
      )}
    </div>
  );
}
