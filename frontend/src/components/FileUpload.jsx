import { useState, useRef } from "react";
import apiClient from "../utils/apiClient";
import useSessionStore from "../store/sessionStore";
import { Upload, FileText, CheckCircle, Loader2, AlertCircle } from "lucide-react";

export default function FileUpload() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const setExtractedData = useSessionStore((s) => s.setExtractedData);
  const existingData = useSessionStore((s) => s.extractedData);

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Limit check (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("FILE SIZE EXCEEDS 5MB LIMIT.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", sessionId);

    try {
      const res = await apiClient.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        setExtractedData(res.data.extracted_data);
        setSuccess(true);
      } else {
        setError(res.data.error || "UPLOAD FAILED.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("SERVER_ERROR: FAILED TO PROCESS INTELLIGENCE.");
    } finally {
      setIsUploading(false);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`tactical-upload-zone ${success ? 'success' : ''} ${isUploading ? 'loading' : ''}`}>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        style={{ display: 'none' }}
        accept=".pdf,.xlsx,.xls,.txt"
      />
      
      <div className="upload-content" onClick={isUploading ? null : triggerUpload}>
        {isUploading ? (
          <Loader2 className="upload-icon spinning" size={24} />
        ) : success || existingData ? (
          <CheckCircle className="upload-icon success" size={24} />
        ) : (
          <Upload className="upload-icon" size={24} />
        )}
        
        <div className="upload-text-group">
          <span className="upload-main-text">
            {isUploading ? "EXTRACTING_INTEL..." : success || existingData ? "INTELLIGENCE_LOCKED" : "UPLOAD_NEGOTIATION_DOC"}
          </span>
          <span className="upload-sub-text">
            {isUploading ? "LLAMA_3.3_70B ANALYSIS IN PROGRESS" : "SUPPORTED: PDF, XLSX, TXT (MAX 5MB)"}
          </span>
        </div>
      </div>

      {error && (
        <div className="upload-error-tag">
          <AlertCircle size={12} /> {error}
        </div>
      )}

      <style>{`
        .tactical-upload-zone {
          border: 1px dashed #333;
          background: #0A0A0A;
          border-radius: 4px;
          padding: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .tactical-upload-zone:hover {
          border-color: #DFFF00;
          background: #111;
        }

        .tactical-upload-zone.success {
          border: 1px solid #DFFF0022;
          background: #DFFF0005;
        }

        .upload-content {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .upload-icon {
          color: #555;
        }

        .upload-icon.success {
          color: #DFFF00;
        }

        .spinning {
          animation: spin 2s linear infinite;
          color: #DFFF00;
        }

        .upload-text-group {
          display: flex;
          flex-direction: column;
        }

        .upload-main-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #EEE;
        }

        .upload-sub-text {
          font-size: 9px;
          color: #444;
          text-transform: uppercase;
        }

        .upload-error-tag {
          margin-top: 10px;
          color: #ff4545;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
