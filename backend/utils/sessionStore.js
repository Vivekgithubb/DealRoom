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
  });
  return sessions.get(id);
}

function getSession(id) {
  return sessions.get(id) || null;
}

function updateSession(id, updates) {
  const s = sessions.get(id);
  if (s) {
    Object.assign(s, updates);
  }
}

function deleteSession(id) {
  sessions.delete(id);
}

function getAllSessions() {
  return sessions;
}

module.exports = { createSession, getSession, updateSession, deleteSession, getAllSessions };
