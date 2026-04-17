import { useState, useRef, useCallback, useEffect } from "react";

const USE_DEEPGRAM = import.meta.env.VITE_USE_DEEPGRAM === "true";

export function useSTT(onTranscript, onInterim) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const isActiveRef = useRef(false);

  const stop = useCallback(() => {
    isActiveRef.current = false;
    // 1. Kill Web Speech API
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onresult = null;
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    // 2. Kill Deepgram WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // 3. Kill MediaRecorder
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      mediaRecorderRef.current = null;
    }

    // 4. Kill Media Stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsListening(false);
    console.log("[STT] All streams and recognizers terminated.");
  }, []);

  const startWebSpeech = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("[STT] Web Speech API not supported.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const text = last[0].transcript.trim();
      if (last.isFinal) {
        onTranscript(text);
        if (onInterim) onInterim("");
      } else {
        if (onInterim) onInterim(text);
      }
    };

    recognition.onerror = (e) => {
      console.error("[STT] WebSpeech Error:", e.error);
      if (e.error === "not-allowed") {
        isActiveRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (isListening) {
        try {
          recognition.start();
        } catch (e) {}
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    console.log("[STT] WebSpeech active.");
  }, [onTranscript, onInterim, isListening]);

  const startDeepgram = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isActiveRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      const ws = new WebSocket(
        "wss://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&interim_results=true",
        ["token", import.meta.env.VITE_DEEPGRAM_KEY],
      );
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isActiveRef.current) {
          ws.close();
          return;
        }
        const recorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(e.data);
          }
        };
        recorder.start(250);
        mediaRecorderRef.current = recorder;
        setIsListening(true);
        console.log("[STT] Deepgram active.");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const text = data?.channel?.alternatives?.[0]?.transcript;
        if (text && data.is_final) {
          onTranscript(text.trim());
          if (onInterim) onInterim("");
        } else if (text) {
          if (onInterim) onInterim(text.trim());
        }
      };

      ws.onerror = () => {
        console.warn("[STT] Deepgram failed, falling back...");
        stop();
        isActiveRef.current = true;
        setIsListening(true);
        startWebSpeech();
      };
    } catch (err) {
      console.error("[STT] Deepgram start failed:", err);
      startWebSpeech();
    }
  }, [onTranscript, onInterim, startWebSpeech, stop]);

  const start = useCallback(() => {
    if (isActiveRef.current) return;
    isActiveRef.current = true;
    setIsListening(true);

    if (USE_DEEPGRAM) {
      startDeepgram();
    } else {
      startWebSpeech();
    }
  }, [startDeepgram, startWebSpeech]);

  // Clean up on unmount
  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { start, stop, isListening };
}
