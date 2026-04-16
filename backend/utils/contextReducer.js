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

function reduceContext(session, maxTurns = 7) {
  const recentTurns = session.transcript.slice(-maxTurns);
  return {
    deal_type: session.dealContext.deal_type,
    goal: session.dealContext.goal,
    walkaway: session.dealContext.walkaway,
    playbook_summary: session.playbookSummary,
    turns: recentTurns,
  };
}

module.exports = { reduceContext };
