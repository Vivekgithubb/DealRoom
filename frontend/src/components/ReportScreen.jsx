import { useState, useEffect } from "react";
import apiClient from "../utils/apiClient";
import useSessionStore from "../store/sessionStore";
import { Terminal, Copy, Check, RefreshCcw } from "lucide-react";

export default function ReportScreen() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const report = useSessionStore((s) => s.report);
  const setReport = useSessionStore((s) => s.setReport);
  const resetSession = useSessionStore((s) => s.resetSession);
  const powerScore = useSessionStore((s) => s.powerScore);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!report) generateReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generateReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.post("/report", { session_id: sessionId });
      if (res.data.success) {
        setReport(res.data.report);
      } else {
        setError("FAILED TO GENERATE POST-ACTION REPORT.");
      }
    } catch (err) {
      console.error("Report error:", err);
      setError(err.response?.data?.error || "CONNECTION_TIMEOUT: FAILED TO RETRIEVE ANALYTICS.");
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

  const handleNewSession = () => resetSession();

  if (isLoading) {
    return (
      <div className="tactical-loading-screen">
        <div className="terminal-loader">
          <Terminal className="loader-icon" size={48} />
          <div className="loader-title">EXTRACTING_INTEL</div>
          <div className="loader-progress-bar">
            <div className="loader-progress-fill" />
          </div>
          <div className="loader-subtitle">DECODING NEGOTIATION TRANSCRIPT...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tactical-report-wrapper">
        <div className="tactical-alert" style={{ marginBottom: '40px', borderColor: '#ff4545', color: '#ff4545', background: 'rgba(255, 69, 69, 0.1)', padding: '20px', borderRadius: '4px' }}>
          [!] CRITICAL_ERROR: {error}
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button className="tactical-submit-btn" onClick={generateReport}>RETRY_EXTRACTION</button>
          <button className="btn btn-secondary" onClick={handleNewSession}>INIT_NEW_SESSION</button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="tactical-report-wrapper">
      <div className="report-header-tactical">
        <div className="badge-tactical">POST_ENGAGEMENT_ANALYTICS</div>
        <h1 className="report-title-tactical">MISSION_DEBRIEF</h1>
        <p className="report-subtitle-tactical">COMPREHENSIVE ANALYSIS OF NEGOTIATION PROTOCOLS AND OUTCOMES.</p>
      </div>

      <div className="report-grid-tactical">
        {/* Row 1: Power Score & Summary */}
        <div className="report-card-tactical power-box">
             <div className="card-label-tactical">FINAL_POWER_BALANCE</div>
             <div className="power-score-value" style={{ color: powerScore > 0 ? '#DFFF00' : powerScore < 0 ? '#ff4545' : '#888888' }}>
                {powerScore > 0 ? "+" : ""}{powerScore}
             </div>
             <div className="power-score-desc">UNIT_ADVANTAGE_DIFFERENTIAL</div>
        </div>

        <div className="report-card-tactical summary-box">
          <div className="card-label-tactical">EXECUTIVE_SUMMARY</div>
          <p className="report-text-tactical">{report.summary}</p>
        </div>

        {/* Row 2: Performance Log (Full Width) */}
        <div className="report-card-tactical performance-box full-width">
            <div className="card-label-tactical">TACTICAL_PERFORMANCE_LOG</div>
            <div className="intel-grid">
                <div className="intel-section">
                    <div className="intel-header success">TRANSCRIPTION_WINS</div>
                    <ul className="intel-list">
                        {report.wins?.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                </div>

                <div className="intel-section">
                    <div className="intel-header danger">PROTOCOL_FAILURES</div>
                    <ul className="intel-list">
                        {report.losses?.map((l, i) => <li key={i}>{l}</li>)}
                    </ul>
                </div>

                <div className="intel-section">
                    <div className="intel-header warning">MISSED_STRATEGIC_NODES</div>
                    <ul className="intel-list">
                        {report.missed_opportunities?.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                </div>
            </div>
        </div>

        {/* Row 3: Style & Email */}
        <div className="report-card-tactical style-box">
             <div className="card-label-tactical">ENGAGEMENT_STYLE_ANALYSIS</div>
             <div className="style-quote">"{report.negotiation_style}"</div>
        </div>

        <div className="report-card-tactical email-box">
            <div className="card-label-tactical">FOLLOW_UP_PROTOCOL_DRAFT</div>
            <div className="email-content-wrapper">
                <div className="email-text">{report.follow_up_email}</div>
                <button className={`copy-btn-tactical ${copied ? 'copied' : ''}`} onClick={copyEmail}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'PROTOCOL_COPIED' : 'COPY_MAIL'}
                </button>
            </div>
        </div>
      </div>

      <div className="report-final-actions">
          <button className="tactical-submit-btn-lg" onClick={handleNewSession}>
            <RefreshCcw size={20} /> INITIALIZE_NEW_SEQUENCE
          </button>
      </div>

      <style>{`
        .tactical-report-wrapper {
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 20px;
          font-family: 'Space Grotesk', sans-serif;
          background-color: #050505;
        }

        .report-header-tactical { margin-bottom: 40px; }
        .badge-tactical { display: inline-block; background: #DFFF00; color: #000; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 11px; padding: 4px 10px; margin-bottom: 15px; }
        .report-title-tactical { font-family: 'Bebas Neue', sans-serif; font-size: 64px; line-height: 1; color: #FFFFFF; margin-bottom: 10px; }
        .report-subtitle-tactical { color: #888; font-family: 'JetBrains Mono', monospace; font-size: 13px; max-width: 600px; }

        .report-grid-tactical { display: grid; grid-template-columns: 300px 1fr; gap: 20px; }
        .report-card-tactical { background: #111; border: 1px solid #222; padding: 25px; border-radius: 4px; overflow: hidden; }
        .full-width { grid-column: span 2; }

        .power-box { text-align: center; display: flex; flex-direction: column; justify-content: center; }
        .power-score-value { font-family: 'Bebas Neue', sans-serif; font-size: 72px; line-height: 1; }
        .power-score-desc { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #444; margin-top: 5px; }

        .card-label-tactical { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #555; letter-spacing: 0.1em; margin-bottom: 15px; border-bottom: 1px solid #222; padding-bottom: 8px; }
        .report-text-tactical { font-size: 15px; color: #CCC; line-height: 1.6; }

        .intel-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .intel-header { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; margin-bottom: 10px; }
        .intel-header.success { color: #DFFF00; }
        .intel-header.danger { color: #ff4545; }
        .intel-header.warning { color: #FFA500; }
        .intel-list { list-style: none; padding: 0; }
        .intel-list li { font-size: 12px; color: #888; margin-bottom: 6px; line-height: 1.4; display: flex; gap: 6px; }
        .intel-list li::before { content: '>'; color: #444; font-weight: 700; }

        .style-quote { font-style: italic; color: #DFFF00; font-size: 14px; line-height: 1.5; }
        .email-text { font-size: 12px; color: #999; line-height: 1.5; max-height: 120px; overflow-y: auto; background: #000; padding: 15px; border: 1px solid #222; margin-bottom: 15px; }

        .copy-btn-tactical { width: 100%; background: #DFFF00; border: none; padding: 12px; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .copy-btn-tactical.copied { background: #FFFFFF; }

        .report-final-actions { margin-top: 40px; display: flex; justify-content: center; }
        .tactical-submit-btn-lg { background: #DFFF00; color: #000; border: none; font-family: 'Bebas Neue', sans-serif; font-size: 24px; padding: 15px 40px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.2s; }
        .tactical-submit-btn-lg:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(223, 255, 0, 0.3); }

        .tactical-loading-screen { background: #000; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; }
        .terminal-loader { text-align: center; width: 300px; }
        .loader-icon { color: #DFFF00; animation: terminal-blink 1s infinite; margin-bottom: 20px; }
        .loader-title { color: #FFFFFF; font-size: 16px; font-weight: 700; letter-spacing: 0.2em; margin-bottom: 15px; }
        .loader-progress-bar { height: 2px; background: #111; width: 100%; margin-bottom: 15px; overflow: hidden; }
        .loader-progress-fill { height: 100%; background: #DFFF00; width: 100%; animation: fill 3s linear; }
        .loader-subtitle { color: #444; font-size: 9px; text-transform: uppercase; }

        @keyframes terminal-blink { 50% { opacity: 0; } }
        @keyframes fill { from { width: 0%; } to { width: 100%; } }

        @media (max-width: 968px) {
          .report-grid-tactical { grid-template-columns: 1fr; }
          .full-width { grid-column: span 1; }
          .intel-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
