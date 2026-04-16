import useSessionStore from "../store/sessionStore";
import { Terminal, Cpu, Quote, Activity, ShieldAlert } from "lucide-react";

export default function WhisperCard() {
  const currentWhisper = useSessionStore((s) => s.currentWhisper);

  if (!currentWhisper) {
    return (
      <div className="tactical-sidebar-card empty x-large-card">
        <div className="tactical-sidebar-header">AI_COORDINATOR</div>
        <div className="whisper-placeholder">
          <Terminal size={48} color="#262626" />
          <p>AWAITING HOSTILE TRANSMISSION...</p>
        </div>
        <style>{`
          .x-large-card {
            min-height: 300px;
            display: flex;
            flex-direction: column;
          }
          .whisper-placeholder {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #333333;
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            text-align: center;
            gap: 20px;
          }
        `}</style>
      </div>
    );
  }

  const confidencePct = Math.round((currentWhisper.confidence || 0) * 100);

  // Color logic for risk
  const getRiskColor = (risk) => {
      switch(risk?.toUpperCase()) {
          case 'CRITICAL': return '#ff4545';
          case 'HIGH': return '#ff8c00';
          case 'MODERATE': return '#ffd700';
          default: return '#DFFF00';
      }
  };

  return (
    <div className="tactical-sidebar-card whisper-active x-large-card">
      <div className="tactical-sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={16} color="#DFFF00" />
            <span style={{ fontSize: '12px' }}>AI_WHISPER_FEED</span>
        </div>
        <div className="whisper-meta-badges">
            <span className="meta-badge sentiment-badge">
                <Activity size={10} /> {currentWhisper.sentiment || 'NEUTRAL'}
            </span>
            <span className="meta-badge risk-badge" style={{ borderColor: getRiskColor(currentWhisper.risk_score), color: getRiskColor(currentWhisper.risk_score) }}>
                <ShieldAlert size={10} /> {currentWhisper.risk_score || 'LOW'}
            </span>
        </div>
      </div>

      <div className="whisper-body">
        <div className="whisper-advice-small">
           <span className="advice-tag">STRATEGIC_SUMMARY</span>
           {currentWhisper.suggestion}
        </div>

        <div className="whisper-script-block">
            <Quote size={24} color="#DFFF00" style={{ marginBottom: '10px', opacity: 0.5 }} />
            <div className="whisper-script-text">
               {currentWhisper.script || currentWhisper.suggestion}
            </div>
            <div className="script-footer">VERBATIM_DIALOGUE_SCRIPT</div>
        </div>
        
        <div className="whisper-reasoning-summary">
          {currentWhisper.reasoning}
        </div>
      </div>

      <div className="confidence-track-large">
        <div 
          className="confidence-fill-large" 
          style={{ width: `${confidencePct}%` }}
        />
        <span className="conf-pct-float">{confidencePct}% CONFIDENCE</span>
      </div>

      <style>{`
        .x-large-card {
          min-height: 480px;
          display: flex;
          flex-direction: column;
          border-left: 6px solid #DFFF00;
          background: linear-gradient(135deg, #1A1A1A 0%, #080808 100%);
          padding: 30px !important;
          box-shadow: 0 20px 50px rgba(0,0,0,0.8);
          position: relative;
        }

        .whisper-meta-badges {
            display: flex;
            gap: 10px;
        }

        .meta-badge {
            font-family: 'JetBrains Mono', monospace;
            font-size: 9px;
            padding: 2px 8px;
            border: 1px solid #333;
            border-radius: 20px;
            display: flex;
            align-items: center;
            gap: 4px;
            text-transform: uppercase;
        }

        .sentiment-badge { color: #888; border-color: #333; }

        .whisper-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin: 20px 0;
        }

        .whisper-advice-small {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          color: #888888;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .advice-tag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #555555;
          letter-spacing: 0.1em;
        }

        .whisper-script-block {
          background: #000000;
          border: 1px solid #333333;
          padding: 30px;
          position: relative;
          box-shadow: inset 0 0 20px rgba(223, 255, 0, 0.05);
        }

        .whisper-script-text {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: #FFFFFF;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        .script-footer {
          margin-top: 20px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #DFFF00;
          opacity: 0.6;
          letter-spacing: 0.2em;
          text-align: right;
        }

        .whisper-reasoning-summary {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #555555;
          line-height: 1.6;
          padding-left: 10px;
          border-left: 1px solid #222;
        }

        .confidence-track-large {
          height: 4px;
          background: #222222;
          width: 100%;
          margin-top: auto;
          position: relative;
        }

        .confidence-fill-large {
          height: 100%;
          background: #DFFF00;
          box-shadow: 0 0 15px #DFFF00AA;
          transition: width 1s ease-out;
        }

        .conf-pct-float {
            position: absolute;
            right: 0;
            top: -18px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 9px;
            color: #444;
        }
      `}</style>
    </div>
  );
}
