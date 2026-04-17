/**
 * In-memory session store.
 * Fast, zero setup. Data lives as long as the server does.
 * The session_id comes from the client (UUID from localStorage).
 */

const sessions = new Map();

function createSession(id, dealContext) {
  sessions.set(id, {
    dealContext,
    playbookSummary: "",
    transcript: [],
    whispers: [],
    extractedData: {}, // Structured info from uploaded docs
    practiceTranscript: [],
    practiceTurns: 0,
    practiceWhispers: [],
    practiceCounterpart: null,
  });
  return sessions.get(id);
}

function getSession(id) {
  return sessions.get(id) || null;
}

function ensureSession(id) {
  let s = sessions.get(id);
  if (!s) {
    s = {
      dealContext: { deal_type: "Unknown", goal: "", walkaway: "" },
      playbookSummary: "",
      transcript: [],
      whispers: [],
      extractedData: {},
      practiceTranscript: [],
      practiceTurns: 0,
      practiceWhispers: [],
      practiceCounterpart: null,
    };
    sessions.set(id, s);
  }
  return s;
}

function updateSession(id, updates) {
  const s = ensureSession(id);
  Object.assign(s, updates);
}

function deleteSession(id) {
  sessions.delete(id);
}

function getAllSessions() {
  return sessions;
}

module.exports = { createSession, getSession, updateSession, deleteSession, getAllSessions, ensureSession };
