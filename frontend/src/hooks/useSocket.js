/**
 * useSocket Hook
 * 
 * Manages Socket.io connection and event handlers.
 * Connects to the backend and listens for whisper responses.
 */

import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import useSessionStore from "../store/sessionStore";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export function useSocket() {
  const socketRef = useRef(null);
  const addWhisper = useSessionStore((s) => s.addWhisper);
  const setError = useSessionStore((s) => s.setError);
  const sessionId = useSessionStore((s) => s.sessionId);
  const behaviorMode = useSessionStore((s) => s.behaviorMode);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket.id);
    });

    socket.on("whisper:response", (response) => {
      console.log("[Socket] Whisper received:", response);
      addWhisper(response);
    });

    socket.on("whisper:error", (err) => {
      console.error("[Socket] Whisper error:", err.message);
      setError(err.message);
    });

    socket.on("session:ready", (data) => {
      console.log("[Socket] Session ready:", data);
    });

    socket.on("report:ready", (data) => {
      console.log("[Socket] Report ready:", data);
    });

    socket.on("disconnect", () => {
      console.warn("[Socket] Disconnected. Attempting reconnect...");
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [addWhisper, setError]);

  // Emit "turn:them" event
  const emitThemTurn = useCallback(
    (text) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("turn:them", {
          text,
          session_id: sessionId,
          behaviorMode,
        });
        console.log("[Socket] Emitted turn:them:", text);
      } else {
        console.error("[Socket] Cannot emit — not connected");
        setError("Socket not connected. Please refresh.");
      }
    },
    [sessionId, behaviorMode, setError]
  );

  // Emit "turn:me" event (stores in backend transcript)
  const emitMeTurn = useCallback(
    (text) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("turn:me", {
          text,
          session_id: sessionId,
        });
      }
    },
    [sessionId]
  );

  return {
    emitThemTurn,
    emitMeTurn,
  };
}
