import { useState, useEffect } from "react";
import apiClient from "../utils/apiClient";
import useSessionStore from "../store/sessionStore";

export default function ReportScreen() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const report = useSessionStore((s) => s.report);
  const setReport = useSessionStore((s) => s.setReport);
  const setPhase = useSessionStore((s) => s.setPhase);
  const resetSession = useSessionStore((s) => s.resetSession);
  const powerScore = useSessionStore((s) => s.powerScore);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!report) {
      generateReport();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generateReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.post("/report", { session_id: sessionId });
      if (res.data.success) {
        setReport(res.data.report);
      } else {
        setError("Failed to generate report.");
      }
    } catch (err) {
      console.error("Report error:", err);
      setError(err.response?.data?.error || "Failed to generate report.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyEmail = () => {
    if (report?.follow_up_email) {
      navigator.clipboard.writeText(report.follow_up_email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNewSession = () => {
    resetSession();
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner spinner-lg"></div>
        <p>Generating your negotiation report...</p>
        <p className="text-sm text-muted">
          Analyzing full transcript and strategy alignment
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-container">
        <div className="red-flag-alert">
          <span className="red-flag-icon">⚠️</span>
          <span className="red-flag-text">{error}</span>
        </div>
        <div className="setup-actions" style={{ marginTop: "24px" }}>
          <button className="btn btn-primary" onClick={generateReport}>
            Retry
          </button>
          <button className="btn btn-secondary" onClick={handleNewSession}>
            New Session
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="report-container">
      <div className="report-header">
        <h1 className="report-title">📊 Negotiation Report</h1>
        <p className="report-subtitle">
          Here's how your negotiation went, with AI-powered analysis.
        </p>
      </div>

      {/* Summary */}
      <div className="report-section">
        <div className="card">
          <h3 className="report-section-title">
            📝 Summary
          </h3>
          <p
            style={{
              color: "var(--color-text-secondary)",
              lineHeight: "var(--leading-relaxed)",
            }}
          >
            {report.summary}
          </p>
        </div>
      </div>

      {/* Power Score */}
      <div className="report-section">
        <div
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-4)",
            padding: "var(--space-8)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "var(--text-4xl)",
                fontWeight: "var(--font-bold)",
                color:
                  powerScore > 0
                    ? "var(--color-success)"
                    : powerScore < 0
                    ? "var(--color-danger)"
                    : "var(--color-warning)",
              }}
            >
              {powerScore > 0 ? "+" : ""}
              {powerScore}
            </div>
            <div
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--color-text-muted)",
                marginTop: "var(--space-1)",
              }}
            >
              Final Power Score
            </div>
          </div>
        </div>
      </div>

      {/* Wins */}
      {report.wins && report.wins.length > 0 && (
        <div className="report-section">
          <div className="card">
            <h3 className="report-section-title">
              <span style={{ color: "var(--color-success)" }}>✅</span> Wins
            </h3>
            <ul className="report-list wins">
              {report.wins.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Losses */}
      {report.losses && report.losses.length > 0 && (
        <div className="report-section">
          <div className="card">
            <h3 className="report-section-title">
              <span style={{ color: "var(--color-danger)" }}>❌</span> Losses
            </h3>
            <ul className="report-list losses">
              {report.losses.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Missed Opportunities */}
      {report.missed_opportunities && report.missed_opportunities.length > 0 && (
        <div className="report-section">
          <div className="card">
            <h3 className="report-section-title">
              <span style={{ color: "var(--color-warning)" }}>💡</span> Missed
              Opportunities
            </h3>
            <ul className="report-list missed">
              {report.missed_opportunities.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Negotiation Style */}
      {report.negotiation_style && (
        <div className="report-section">
          <div className="card">
            <h3 className="report-section-title">🎭 Your Negotiation Style</h3>
            <p
              style={{
                color: "var(--color-text-secondary)",
                lineHeight: "var(--leading-relaxed)",
                fontStyle: "italic",
              }}
            >
              {report.negotiation_style}
            </p>
          </div>
        </div>
      )}

      {/* Follow-up Email */}
      {report.follow_up_email && (
        <div className="report-section">
          <div className="card">
            <h3 className="report-section-title">📧 Follow-up Email</h3>
            <div className="report-email">
              <button
                className={`btn ${copied ? "btn-success" : "btn-secondary"} report-copy-btn`}
                onClick={copyEmail}
              >
                {copied ? "✓ Copied!" : "📋 Copy"}
              </button>
              <div className="report-email-content">
                {report.follow_up_email}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="setup-actions" style={{ marginTop: "40px" }}>
        <button className="btn btn-primary btn-lg" onClick={handleNewSession}>
          🔄 Start New Session
        </button>
      </div>
    </div>
  );
}
