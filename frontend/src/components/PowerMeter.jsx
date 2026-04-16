import { usePowerMeter } from "../hooks/usePowerMeter";

export default function PowerMeter() {
  const { percentage, label, color, powerScore } = usePowerMeter();

  return (
    <div className="tactical-powermeter">
      <div className="powermeter-data">
        <div className="powermeter-score">
          <span className="score-value" style={{ color: color }}>
            {powerScore > 0 ? "+" : ""}{powerScore}
          </span>
          <span className="score-label">UNIT_ADVANTAGE</span>
        </div>
        <div className="powermeter-status" style={{ borderColor: color, color: color }}>
          {label.toUpperCase()}
        </div>
      </div>

      <div className="powermeter-track">
        <div className="track-marker track-left">THEM</div>
        <div className="track-marker track-right">YOU</div>
        <div className="track-center-indicator" />
        
        <div className="track-progress-container">
            <div 
                className="track-progress-fill" 
                style={{ 
                    left: percentage > 50 ? '50%' : `${percentage}%`,
                    width: `${Math.abs(percentage - 50)}%`,
                    backgroundColor: color,
                    boxShadow: `0 0 10px ${color}44`
                }} 
            />
        </div>
      </div>

      <div className="powermeter-grid-overlay">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="grid-line" />
        ))}
      </div>
      
      <style>{`
        .tactical-powermeter {
          background: #000000;
          border: 1px solid #262626;
          padding: 20px;
          position: relative;
          overflow: hidden;
          font-family: 'JetBrains Mono', monospace;
        }

        .powermeter-data {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 15px;
          position: relative;
          z-index: 2;
        }

        .powermeter-score {
          display: flex;
          flex-direction: column;
        }

        .score-value {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 32px;
          line-height: 1;
        }

        .score-label {
          font-size: 10px;
          color: #555555;
          letter-spacing: 0.1em;
        }

        .powermeter-status {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border: 1px solid;
          background: rgba(255, 255, 255, 0.05);
        }

        .powermeter-track {
          height: 30px;
          background: #111111;
          position: relative;
          border: 1px solid #262626;
          display: flex;
          align-items: center;
          padding: 0 10px;
          z-index: 2;
        }

        .track-marker {
          position: absolute;
          font-size: 9px;
          color: #444444;
          font-weight: 700;
          bottom: -15px;
        }

        .track-left { left: 0; }
        .track-right { right: 0; }

        .track-center-indicator {
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 1px;
          background: #333333;
          z-index: 1;
        }

        .track-progress-container {
          position: absolute;
          left: 10px;
          right: 10px;
          top: 0;
          bottom: 0;
        }

        .track-progress-fill {
          position: absolute;
          top: 8px;
          bottom: 8px;
          transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .powermeter-grid-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          justify-content: space-between;
          pointer-events: none;
          opacity: 0.1;
        }

        .grid-line {
          width: 1px;
          height: 100%;
          background: #555555;
        }
      `}</style>
    </div>
  );
}
