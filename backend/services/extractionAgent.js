const { callGemini } = require("./gemini");

/**
 * Extraction Agent using LLaMA 3.3 70B (Groq)
 */
async function extractNegotiationData(text) {
  if (!text || !text.trim()) {
    return createEmptyResponse();
  }

  const prompt = `You MUST return ONLY valid JSON.
Do NOT include explanations.
Do NOT include markdown. 
Do NOT include text before or after JSON.
If you fail, the system will break.

---

You are a negotiation data extractor.

Extract structured insights from the document below.

Return ONLY JSON:

{
  "price_range": null,
  "previous_offers": [],
  "market_average": null,
  "constraints": [],
  "key_terms": [],
  "notes": ""
}

Rules:
* Extract only negotiation-relevant information
* Do NOT hallucinate
* If data is missing, return null
* Keep output concise
* No explanations

DOCUMENT:
${text}`;

  try {
    const raw = await callGemini(prompt, 1000); // 1000 tokens for safety
    return cleanJSON(raw);
  } catch (err) {
    console.error("[ExtractionAgent] LLaMA extraction failed:", err.message);
    return createEmptyResponse();
  }
}

/**
 * JSON Cleaning logic (MANDATORY)
 */
function cleanJSON(raw) {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Invalid JSON");
    const cleaned = raw.slice(start, end + 1);
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[ExtractionAgent] JSON cleaning error:", err.message);
    return createEmptyResponse();
  }
}

function createEmptyResponse() {
  return {
    price_range: null,
    previous_offers: [],
    market_average: null,
    constraints: [],
    key_terms: [],
    notes: "No negotiation-relevant data extracted or data unavailable."
  };
}

module.exports = { extractNegotiationData };
