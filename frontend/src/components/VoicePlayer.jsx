import { useEffect, useRef } from "react";

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return (
    voices.find((voice) => /en/i.test(voice.lang) && /natural|zira|aria|davis|jenny/i.test(voice.name)) ||
    voices.find((voice) => /en/i.test(voice.lang)) ||
    null
  );
}

export default function VoicePlayer({ text, speakToken, enabled, onStart, onEnd }) {
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);

  useEffect(() => {
    onStartRef.current = onStart;
    onEndRef.current = onEnd;
  }, [onEnd, onStart]);

  useEffect(() => {
    if (!enabled || !text || !window.speechSynthesis) {
      return undefined;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.94;
    utterance.pitch = 0.98;
    utterance.volume = 1;

    const selectedVoice = pickVoice();
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => onStartRef.current?.();
    utterance.onend = () => onEndRef.current?.();
    utterance.onerror = () => onEndRef.current?.();

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [enabled, speakToken, text]);

  return null;
}
