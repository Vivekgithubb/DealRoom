import { useCallback } from "react";

/**
 * useTTS Hook
 * Simple wrapper for Web Speech API Synthesis
 */
export default function useTTS() {
  const speak = useCallback((text, onEnd) => {
    if (!window.speechSynthesis) {
      console.warn("Speech synthesis not supported.");
      if (onEnd) onEnd();
      return;
    }

    // Cancel existing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Tactical parameters (slightly deeper, calm)
    utterance.rate = 0.95; 
    utterance.pitch = 0.9;
    
    // Choose a male voice if possible for the "interviewer" vibe
    const voices = window.speechSynthesis.getVoices();
    const googleVoice = voices.find(v => v.name.includes("Google") && v.name.includes("English"));
    if (googleVoice) utterance.voice = googleVoice;

    if (onEnd) {
      utterance.onend = () => {
        // Small tactical pause after speaking
        setTimeout(onEnd, 500);
      };
    }

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  return { speak, stop };
}
