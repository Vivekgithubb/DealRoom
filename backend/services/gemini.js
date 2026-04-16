// /**
//  * Gemini Flash Wrapper
//  *
//  * Model: gemini-1.5-flash
//  * Temperature: 0.3 (low = faster, more consistent JSON)
//  * Max tokens: ~300 (keeps responses tight)
//  *
//  * Always returns JSON only from the model.
//  */

// const { GoogleGenerativeAI } = require("@google/generative-ai");

// let genai = null;
// let model = null;

// function initGemini() {
//   if (!process.env.GEMINI_API_KEY) {
//     console.error("GEMINI_API_KEY is not set in environment variables.");
//     return;
//   }
//   genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
//   model = genai.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
// }

// async function callGemini(prompt, maxTokens = 300) {
//   if (!model) {
//     initGemini();
//   }
//   if (!model) {
//     throw new Error("Gemini model not initialized. Check GEMINI_API_KEY.");
//   }

//   const result = await model.generateContent({
// contents: [{ role: "user", parts: [{ text: prompt }] }],
//     generationConfig: {
//       maxOutputTokens: maxTokens,
//       temperature: 0.3,
//     },
//   });

//   return result.response.text();
// }

// /**
//  * Parse a JSON response from Gemini.
//  * Gemini sometimes wraps JSON in markdown fences or adds preamble text.
//  * This strips all of that and extracts the JSON object.
//  */
// function parseGeminiJSON(raw) {
//   // Strip markdown fences
//   let cleaned = raw
//     .replace(/```json/gi, "")
//     .replace(/```/g, "")
//     .trim();

//   // Find the JSON block (Gemini sometimes adds text before/after)
//   const jsonStart = cleaned.indexOf("{");
//   const jsonEnd = cleaned.lastIndexOf("}");

//   if (jsonStart === -1 || jsonEnd === -1) {
//     throw new Error("No JSON object found in Gemini response");
//   }

//   return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
// }

// module.exports = { callGemini, parseGeminiJSON, initGemini };

/**
 * Gemma 4 Wrapper (via OpenRouter)
 *
 * Replaces Gemini internally but keeps same function names
 * so rest of system remains unchanged.
 */

let apiKey = null;

function initGemini() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set in environment variables.");
    return;
  }
  apiKey = process.env.GEMINI_API_KEY;
}

/**
 * callGemini (now using Gemma 4 via OpenRouter native fetch)
 */
// async function callGemini(prompt, maxTokens = 300) {
//   if (!apiKey) {
//     initGemini();
//   }

//   if (!apiKey) {
//     throw new Error(
//       "OpenRouter API Key not initialized. Check GEMINI_API_KEY."
//     );
//   }

//   try {
//     const response = await fetch(
//       "https://openrouter.ai/api/v1/chat/completions",
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${apiKey}`,
//           "Content-Type": "application/json",
//           "HTTP-Referer": "http://localhost:5174", // Standard OpenRouter requirement
//           "X-Title": "DealRoom",
//         },
//         body: JSON.stringify({
//           model: "liquid/lfm-2.5-1.2b-thinking:free", // Corrected model string
//           messages: [
//             {
//               role: "system",
//               content:
//                 "You are a negotiation assistant. Return ONLY valid JSON. No markdown fences. No preamble. No explanation. Strictly follow the schema.",
//             },
//             {
//               role: "user",
//               content: prompt,
//             },
//           ],
//           temperature: 0.3,
//           max_tokens: 8000,
//         }),
//       }
//     );

//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(
//         `OpenRouter API error: ${response.status} - ${errorText}`
//       );
//     }

//     const res = await response.json();
//     console.log(res);
//     return res.choices[0].message.content;
//     console.log(res.choices[0].message.content);
//   } catch (err) {
//     console.error("OpenRouter fetch error:", err.message);
//     throw err;
//   }
// }

// /**
//  * Parse JSON (kept same name for compatibility)
//  */
// function parseGeminiJSON(raw) {
//   try {
//     if (!raw) {
//       throw new Error("API returned null or empty content");
//     }

//     let cleaned = raw
//       .replace(/```json/gi, "")
//       .replace(/```/g, "")
//       .trim();

//     const start = cleaned.indexOf("{");
//     const end = cleaned.lastIndexOf("}");

//     if (start === -1 || end === -1) {
//       throw new Error("No JSON found");
//     }

//     return JSON.parse(cleaned.slice(start, end + 1));
//   } catch (err) {
//     console.error("JSON parse error:", err.message);
//     return {
//       suggestion: "Ask a clarifying question",
//       tactic: "unknown",
//       confidence: 0.5,
//       power_delta: 0,
//       red_flag: false,
//       reasoning: "Fallback due to parsing error",
//     };
//   }
// }

// module.exports = {
//   callGemini,
//   parseGeminiJSON,
//   initGemini,
// };

/* =========================================================
 * GROQ INTEGRATION (Commented out)
 * To use Groq instead of OpenRouter, comment out the top
 * code and uncomment this section below!
 * Ensure your .env has GROQ_API_KEY
 * =========================================================
 */
let groqApiKey = null;

function initGemini() {
  if (!process.env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY is not set in environment variables.");
    return;
  }
  groqApiKey = process.env.GROQ_API_KEY;
}

async function callGemini(prompt, maxTokens = 1000) {
  if (!groqApiKey) {
    initGemini();
  }

  if (!groqApiKey) {
    throw new Error("Groq API Key not initialized. Check GROQ_API_KEY.");
  }

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", // Fast, accurate model on Groq
          messages: [
            {
              role: "system",
              content:
                "You are a negotiation assistant. Return ONLY valid JSON. No markdown fences. No preamble. Strictly follow the schema.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.6,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const res = await response.json();
    return res.choices[0].message.content;
  } catch (err) {
    console.error("Groq fetch error:", err.message);
    throw err;
  }
}

function parseGeminiJSON(raw) {
  try {
    if (!raw) throw new Error("API returned null");
    let cleaned = raw
      .replace(/\`\`\`json/gi, "")
      .replace(/\`\`\`/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON found");
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch (err) {
    console.error("JSON parse error:", err.message);
    return {
      suggestion: "Maintain your stance.",
      tactic: "unknown",
      confidence: 0.5,
      power_delta: 0,
      red_flag: false,
      reasoning: "Fallback due to parsing error",
    };
  }
}

module.exports = {
  callGemini,
  parseGeminiJSON,
  initGemini,
};
