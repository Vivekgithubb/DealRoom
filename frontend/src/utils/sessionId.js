/**
 * Session ID utility
 * Generates a UUID and persists it in localStorage.
 * Sent with every request to the backend.
 */

export function getSessionId() {
  let id = localStorage.getItem("dealroom_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("dealroom_session_id", id);
  }
  return id;
}

export function resetSessionId() {
  const id = crypto.randomUUID();
  localStorage.setItem("dealroom_session_id", id);
  return id;
}
