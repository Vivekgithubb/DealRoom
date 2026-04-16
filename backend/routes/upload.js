const express = require("express");
const router = express.Router();
const multer = require("multer");
const { getSession, updateSession, ensureSession } = require("../utils/sessionStore");
const { parseDocument } = require("../services/documentParser");
const { extractNegotiationData } = require("../services/extractionAgent");

// Multer Memory Storage Configuration (Max 5MB)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage, 
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit as requested
});

/**
 * POST /api/upload
 * multipart/form-data
 * file (PDF, XLSX, TXT)
 */
router.post("/", upload.single("file"), async (req, res) => {
  const { session_id } = req.body;
  const file = req.file;

  if (!session_id) {
    return res.status(400).json({ success: false, error: "Missing session_id." });
  }

  if (!file) {
    return res.status(400).json({ success: false, error: "No file uploaded." });
  }

  const session = ensureSession(session_id);
  if (!session) {
    return res.status(500).json({ success: false, error: "System could not initialize session." });
  }

  try {
    const rawText = await parseDocument(file.buffer, file.mimetype);
    const extractedData = await extractNegotiationData(rawText);

    // Update in-memory session via sessionStore.js
    updateSession(session_id, { extractedData });

    return res.json({ success: true, extracted_data: extractedData });
  } catch (err) {
    console.error("[UploadRoute] Extraction failed:", err.message);
    
    // Fallback safe JSON instead of crashing
    const emptyData = {
      price_range: null,
      previous_offers: [],
      market_average: null,
      constraints: [],
      key_terms: [],
      notes: "Error processing document intelligence."
    };
    
    updateSession(session_id, { extractedData: emptyData });
    return res.json({ success: true, extracted_data: emptyData });
  }
});

module.exports = router;
