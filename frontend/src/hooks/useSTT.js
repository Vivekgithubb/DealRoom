/**
 * useSTT Hook — Speech-to-Text abstraction
 *
 * Primary: Deepgram real-time WebSocket streaming
 * Fallback: Web Speech API (browser-based)
 *
 * Automatically falls back if Deepgram fails.
 * Both outputs are normalized to the same format.
 *
 * STT Output Contract:
 * { text: "string", isFinal: boolean, speaker: "me" | "them" }
 */

import { useState, useRef, useCallback } from "react";

const USE_DEEPGRAM = import.meta.env.VITE_USE_DEEPGRAM === "true";

export function useSTT(onTranscript, onInterim) {
  // if (USE_DEEPGRAM) {
  //   return useDeepgramSTT(onTranscript, onInterim);
  // }
  // return useWebSpeechSTT(onTranscript, onInterim);
  return useDeepgramSTT(onTranscript, onInterim);
}

// --- Web Speech API (fallback, default for dev) ---
// function useWebSpeechSTT(onTranscript, onInterim) {
//   const recognitionRef = useRef(null);
//   const [isListening, setIsListening] = useState(false);

//   const start = useCallback(() => {
//     const SpeechRecognition =
//       window.SpeechRecognition || window.webkitSpeechRecognition;

//     if (!SpeechRecognition) {
//       alert("Speech recognition not supported. Please use Chrome.");
//       return;
//     }

//     const recognition = new SpeechRecognition();
//     recognitionRef.current = recognition;

//     recognition.continuous = true;
//     recognition.interimResults = true;
//     recognition.lang = "en-US";

//     recognition.onresult = (event) => {
//       const last = event.results[event.results.length - 1];
//       const text = last[0].transcript.trim();

//       if (last.isFinal) {
//         onTranscript(text);
//         if (onInterim) onInterim("");
//       } else {
//         if (onInterim) onInterim(text);
//       }
//     };

//     recognition.onerror = (e) => {
//       console.error("STT error:", e.error);
//       if (e.error === "not-allowed") {
//         alert("Microphone access denied. Please allow microphone access.");
//       }
//       // Auto-restart on recoverable errors
//       if (e.error === "network" || e.error === "aborted") {
//         setTimeout(() => {
//           if (recognitionRef.current) {
//             try {
//               recognitionRef.current.start();
//             } catch (err) {
//               // Already started, ignore
//             }
//           }
//         }, 1000);
//       } else {
//         setIsListening(false);
//       }
//     };

//     recognition.onend = () => {
//       // Auto-restart if still supposed to be listening
//       if (recognitionRef.current && isListening) {
//         try {
//           recognitionRef.current.start();
//         } catch (err) {
//           // Already started, ignore
//         }
//       }
//     };

//     recognition.start();
//     setIsListening(true);
//   }, [onTranscript, onInterim, isListening]);

//   const stop = useCallback(() => {
//     if (recognitionRef.current) {
//       recognitionRef.current.onend = null; // Prevent auto-restart
//       recognitionRef.current.stop();
//       recognitionRef.current = null;
//     }
//     setIsListening(false);
//   }, []);

//   return { start, stop, isListening };
// }

// --- Deepgram (production) ---
function useDeepgramSTT(onTranscript, onInterim) {
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const fallbackRef = useRef(false);
  const cleanupDeepgram = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ws = new WebSocket(
        "wss://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&interim_results=true",
        ["token", import.meta.env.VITE_DEEPGRAM_KEY]
      );

      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Deepgram] WebSocket connected");

        const recorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(e.data);
          }
        };

        recorder.start(250); // Send audio chunks every 250ms
        mediaRecorderRef.current = recorder;
        setIsListening(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const text = data?.channel?.alternatives?.[0]?.transcript;
        const isFinal = data?.is_final;

        if (text) {
          if (isFinal) {
            onTranscript(text.trim());
            if (onInterim) onInterim("");
          } else {
            if (onInterim) onInterim(text.trim());
          }
        }
      };

      ws.onerror = () => {
        console.warn(
          "[Deepgram] WebSocket error — falling back to Web Speech API"
        );
        if (!fallbackRef.current) {
          fallbackRef.current = true;
          cleanupDeepgram();
          // Fallback to Web Speech API
          startWebSpeechFallback(onTranscript, onInterim, setIsListening);
        }
      };

      ws.onclose = () => {
        console.log("[Deepgram] WebSocket closed");
      };
    } catch (err) {
      console.error("[Deepgram] Failed to start:", err);
      // Fallback to Web Speech API
      startWebSpeechFallback(onTranscript, onInterim, setIsListening);
    }
  }, [onTranscript, onInterim]);

  const stop = useCallback(() => {
    cleanupDeepgram();
    setIsListening(false);
  }, [cleanupDeepgram]);

  return { start, stop, isListening };
}

// Shared fallback function
function startWebSpeechFallback(onTranscript, onInterim, setIsListening) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Neither Deepgram nor Web Speech API available.");
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
    console.error("Fallback STT error:", e.error);
    setIsListening(false);
  };

  recognition.start();
  setIsListening(true);
}
