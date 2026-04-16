import useSessionStore from "../store/sessionStore";
import { Zap, ShieldCheck, MapPin, Tag } from "lucide-react";

export default function ExtractedDataPreview() {
  const data = useSessionStore((s) => s.extractedData);

  if (!data) return null;

  const { price_range, previous_offers, constraints, key_terms, notes } = data;

  return (
    <div className="tactical-preview-panel">
      <div className="preview-header">
        <Zap size={14} color="#DFFF00" />
        <span>DOCUMENT_INTELLIGENCE_EXTRACTED</span>
      </div>

      <div className="preview-grid">
        {price_range && (
          <div className="preview-item">
            <span className="item-label">TARGET_PRICE_RANGE</span>
            <span className="item-value highlight">{price_range}</span>
          </div>
        )}

        {constraints && constraints.length > 0 && (
          <div className="preview-item">
            <span className="item-label">HARD_CONSTRAINTS</span>
            <div className="item-list">
              {constraints.slice(0, 3).map((c, i) => (
                <div key={i} className="list-node">
                  <ShieldCheck size={10} color="#ff4545" /> {c}
                </div>
              ))}
            </div>
          </div>
        )}

        {key_terms && key_terms.length > 0 && (
          <div className="preview-item">
            <span className="item-label">PRIORITY_TERMS</span>
            <div className="item-list">
              {key_terms.slice(0, 3).map((t, i) => (
                <div key={i} className="list-node">
                  <Tag size={10} color="#DFFF00" /> {t}
                </div>
              ))}
            </div>
          </div>
        )}

        {previous_offers && previous_offers.length > 0 && (
          <div className="preview-item">
            <span className="item-label">PREVIOUS_OFFERS</span>
            <div className="item-list">
              {previous_offers.slice(0, 2).map((o, i) => (
                <div key={i} className="list-node">
                   <MapPin size={10} color="#555" /> {o}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {notes && (
        <div className="preview-notes">
           <span className="item-label">TACTICAL_NOTES</span>
           <p>{notes}</p>
        </div>
      )}

      <style>{`
        .tactical-preview-panel {
          margin-top: 15px;
          border: 1px solid #222;
          background: #0D0D0D;
          padding: 15px;
          border-radius: 4px;
          animation: slideDown 0.3s ease-out;
        }

        .preview-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          color: #DFFF00;
          margin-bottom: 20px;
          border-bottom: 1px solid #1A1A1A;
          padding-bottom: 8px;
        }

        .preview-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .preview-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .item-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          color: #444;
          letter-spacing: 0.1em;
        }

        .item-value {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          color: #DDD;
          line-height: 1.2;
        }

        .item-value.highlight {
          color: #DFFF00;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
        }

        .item-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .list-node {
          font-size: 11px;
          color: #888;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .preview-notes {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #1A1A1A;
        }

        .preview-notes p {
          font-size: 11px;
          color: #666;
          line-height: 1.4;
          margin: 0;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
