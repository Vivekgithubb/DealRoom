import useSessionStore from "./store/sessionStore";
import SetupScreen from "./components/SetupScreen";
import LiveSession from "./components/LiveSession";
import ReportScreen from "./components/ReportScreen";
import "./index.css";

function App() {
  const phase = useSessionStore((s) => s.phase);

  const phaseLabels = {
    setup: "Before",
    live: "During",
    report: "After",
  };

  const phaseClass = {
    setup: "phase-setup",
    live: "phase-live",
    report: "phase-report",
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo-icon">D</div>
          <span className="app-logo-text">DealRoom</span>
        </div>

        <div className={`app-phase-badge ${phaseClass[phase]}`}>
          {phase === "live" && <span className="live-dot"></span>}
          {phaseLabels[phase]} Phase
        </div>
      </header>

      {/* Phase Router */}
      {phase === "setup" && <SetupScreen />}
      {phase === "live" && <LiveSession />}
      {phase === "report" && <ReportScreen />}
    </div>
  );
}

export default App;
