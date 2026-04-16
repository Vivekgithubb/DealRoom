/**
 * usePowerMeter Hook
 * 
 * Accumulates power_delta from whisper responses.
 * Computes percentage for the PowerMeter component.
 * 
 * Range: -50 to +50 (clamped) → mapped to 0-100% for display
 * 50% = neutral, >50% = user winning, <50% = them winning
 */

import { useMemo } from "react";
import useSessionStore from "../store/sessionStore";

export function usePowerMeter() {
  const powerScore = useSessionStore((s) => s.powerScore);

  const percentage = useMemo(() => {
    const clamped = Math.max(-50, Math.min(50, powerScore));
    return 50 + clamped; // 50 = neutral, >50 = user winning, <50 = them winning
  }, [powerScore]);

  const label = useMemo(() => {
    if (percentage > 60) return "Strong Position";
    if (percentage > 55) return "Slight Advantage";
    if (percentage >= 45) return "Neutral";
    if (percentage >= 40) return "Slight Disadvantage";
    return "Weak Position";
  }, [percentage]);

  const color = useMemo(() => {
    if (percentage > 60) return "#10b981";
    if (percentage > 55) return "#34d399";
    if (percentage >= 45) return "#f59e0b";
    if (percentage >= 40) return "#f97316";
    return "#ef4444";
  }, [percentage]);

  return { percentage, label, color, powerScore };
}
