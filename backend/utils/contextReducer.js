/**
 * Context Reducer
 * 
 * Trims the transcript to the last N turns before sending to Gemini.
 * This keeps the prompt under 400 tokens for the whisper engine.
 * 
 * Why 7 turns:
 * - 5 is sometimes not enough context for tactic detection
 * - 10 pushes the prompt into a range where Gemini Flash slows down
 * - 6-8 is the practical sweet spot
 */

function buildClaimMemory(transcript = [], maxClaims = 4) {
  const relevantTurns = transcript
    .filter(
      (turn) =>
        turn &&
        turn.speaker === "them" &&
        typeof turn.text === "string" &&
        isClaimLike(turn.text)
    )
    .slice(-maxClaims);

  return relevantTurns.map((turn) => turn.text.trim());
}

function isClaimLike(text) {
  return /(\$|€|£|₹|\b\d[\d,]*(?:\.\d+)?\b|\bprice\b|\bcost\b|\bbudget\b|\brate\b|\bfee\b|\bmonth\b|\bweek\b|\byear\b|\bdelivery\b|\btimeline\b|\bexclusive\b|\bapproval\b|\bconstraint\b)/i.test(
    text
  );
}

function reduceContext(session, maxTurns = 7) {
  const recentTurns = session.transcript.slice(-maxTurns);
  const priorClaimMemory = buildClaimMemory(session.transcript.slice(0, -1));
  return {
    deal_type: session.dealContext.deal_type,
    goal: session.dealContext.goal,
    walkaway: session.dealContext.walkaway,
    playbook_summary: session.playbookSummary,
    extractedData: session.extractedData, // Added for document intelligence
    turns: recentTurns,
    claim_memory: priorClaimMemory,
  };
}

module.exports = { reduceContext };
