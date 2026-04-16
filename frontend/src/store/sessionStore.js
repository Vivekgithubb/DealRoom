/**
 * Zustand Session Store
 *
 * Central state management for the entire DealRoom application.
 * All real-time updates flow through here.
 */

import { create } from "zustand";
import { getSessionId, resetSessionId } from "../utils/sessionId";

const useSessionStore = create((set, get) => ({
  // Session
  sessionId: getSessionId(),
  dealContext: null,
  playbookSummary: "",
  playbook: null,

  // Transcript & Whispers
  transcript: [],
  whispers: [],
  powerScore: 0,
  currentWhisper: null,
  extractedData: null, // Structured document intelligence
  practiceTranscript: [], // Roleplay turns

  // Phase management
  phase: "setup", // "setup" | "live" | "report" | "practice"

  // Report data
  report: null,

  // Simulation data
  simulation: null,
  behaviorMode: "balanced",

  // Loading states
  isLoading: false,
  error: null,

  // STT state
  isListening: false,
  interimText: "",

  // Actions
  setDealContext: (ctx) => set({ dealContext: ctx }),

  setPlaybook: (playbook) =>
    set({
      playbook,
      playbookSummary: playbook.playbook_summary || "",
    }),

  setPhase: (phase) => set({ phase }),

  addTurn: (turn) =>
    set((s) => ({
      transcript: [...s.transcript, { ...turn, timestamp: Date.now() }],
    })),

  addWhisper: (whisper) =>
    set((s) => ({
      whispers: [...s.whispers, whisper],
      currentWhisper: whisper,
      powerScore: s.powerScore + (whisper.power_delta || 0),
    })),

  setExtractedData: (data) => set({ extractedData: data }),

  setReport: (report) => set({ report }),
  setSimulation: (simulation) => set({ simulation }),
  setBehaviorMode: (mode) => set({ behaviorMode: mode }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  addPracticeTurn: (turn) => set((s) => ({
    practiceTranscript: [...s.practiceTranscript, { ...turn, timestamp: Date.now() }]
  })),

  setListening: (isListening) => set({ isListening }),
  setInterimText: (interimText) => set({ interimText }),

  // Reset for new session
  resetSession: () => {
    const newId = resetSessionId();
    set({
      sessionId: newId,
      dealContext: null,
      playbookSummary: "",
      playbook: null,
      transcript: [],
      whispers: [],
      powerScore: 0,
      currentWhisper: null,
      practiceTranscript: [],
      phase: "setup",
      report: null,
      simulation: null,
      behaviorMode: "balanced",
      isLoading: false,
      error: null,
      isListening: false,
      interimText: "",
    });
  },
}));

export default useSessionStore;
