const { callGemini } = require("./gemini");

/**
 * Practice Agent using LLaMA 3.3 70B
 * Simulates a realistic, high-pressure human negotiator.
 */

/**
 * Clean up LLM output to ensure no JSON crumbs or "Dialogue:" prefixes leak through.
 */
function cleanResponse(text) {
  if (!text) return "";
  let cleaned = text.trim();
  
  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(cleaned);
    return (
      parsed.opening_move || 
      parsed.negotiation_opening || 
      parsed.dialogue || 
      parsed.message || 
      parsed.text || 
      cleaned
    );
  } catch (e) {}

  // Remove JSON-like shards manually
  cleaned = cleaned.replace(/^\{.*"[:\s]*/s, "").replace(/[}"']\s*$/g, "");
  
  return cleaned
    .replace(/^(opening_move|negotiation_opening|dialogue|message)[:\s]*/i, "")
    .replace(/^[{"'\s]*(opening_move|negotiation_opening|dialogue|message)["'\s]*:[\s]*/i, "")
    .trim();
}

async function generateFirstMove({ deal_type, goal, walkaway, counterparty_context }) {
  const opponentRole = counterparty_context || "the other party";
  const prompt = `You are roleplaying as the OPPONENT in a negotiation. 
Specifically, you are: ${opponentRole}
The Topic is: ${deal_type}

User's Profile:
- Their Goal: ${goal}
- Their Walkaway: ${walkaway}

YOUR MISSION:
You are the opponent. If the user is a job candidate, you are the Hiring Manager. 
If the user is a student, you are the Teacher. You must protect your interests and push back against the user's goal.

Rules:
1. Speak as the "${opponentRole}". Use appropriate vocabulary for this specific role.
2. Provide a CONCISE opening (2-3 short sentences).
3. Set a tough but realistic starting point that favors YOU.
4. RETURN ONLY DIALOGUE. DO NOT Roleplay the user.
5. NO JSON. NO MARKDOWN. NO BRACKETS.

Example: "As the ${opponentRole}, I've reviewed your request for ${deal_type}. I can offer you [Price/Term], but that's as high as I can go given my constraints."`;

  try {
    const raw = await callGemini(prompt, 200);
    return cleanResponse(raw);
  } catch (err) {
    console.error("[PracticeAgent] Start failed:", err.message);
    return "Thank you for meeting with me. Based on the current situation, I'm prepared to offer a starting point of $90,000 or the equivalent in this context. How does that sound?";
  }
}

async function generateResponse({ deal_type, goal, walkaway, counterparty_context, transcript }) {
  const opponentRole = counterparty_context || "the other party";
  const historyFormatted = transcript
    .map((t) => `${t.speaker === "them" ? `You (${opponentRole})` : "Them (User)"}: ${t.text}`)
    .join("\n");

  const prompt = `You are roleplaying as: ${opponentRole}
Continue the negotiation against the User regarding: ${deal_type}.

YOUR MISSION: 
Defend your position as the "${opponentRole}". Be firm and reach a deal that favors your side.

Context:
- User's Goal: ${goal}
- User's Walkaway: ${walkaway}

History:
${historyFormatted}

Rules:
1. Stay in character as the "${opponentRole}".
2. 2-3 SHORT sentences MAX. 
3. Push back on price or terms effectively.
4. RETURN ONLY DIALOGUE. NO JSON. NO BRACKETS.
5. NO preamble.

Return ONLY the dialogue text.`;

  try {
    const raw = await callGemini(prompt, 250);
    return cleanResponse(raw);
  } catch (err) {
    console.error("[PracticeAgent] Response failed:", err.message);
    return "I hear your points, but as the " + opponentRole + ", I have my own constraints to consider. What's your next move?";
  }
}

module.exports = { generateFirstMove, generateResponse };
