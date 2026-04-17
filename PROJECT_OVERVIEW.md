# DealRoom Project Overview

## What DealRoom Is

DealRoom is a real-time AI negotiation assistant. It helps a user prepare for a negotiation, monitor the live conversation, detect tactics or pressure, recommend next responses, simulate alternative strategies, run practice drills, and generate a post-session report.

The product is designed around a simple idea:

1. Define the negotiation context before the conversation starts.
2. Keep a lightweight tactical memory during the live exchange.
3. Use an LLM as a fast decision engine rather than a full autonomous negotiator.
4. Surface guidance to the user in a controlled UI instead of letting the model drive the session directly.

The app is split into:

- `frontend/`: React + Vite client UI
- `backend/`: Express + Socket.io server with LLM-backed agents
- `dealRoomDesign/`: design assets or related design references

## Core Product Idea

The system treats negotiation support as a sequence of focused AI tasks instead of one giant prompt:

- Setup strategist: understands the deal and produces a playbook
- Live whisper engine: analyzes the other party's latest turn and advises the user
- Simulator: predicts three possible negotiation paths
- Report generator: analyzes the completed session
- Practice mode: roleplays the counterpart and coaches the user
- Document extractor: turns uploaded files into structured negotiation context

This separation keeps each model call smaller, faster, and easier to reason about.

## Main User Flow

### 1. Setup Phase

The user starts in the setup screen and can:

- Enter negotiation topic
- Enter counterparty name or context
- Enter goals, leverage, and walkaway point
- Upload a supporting document such as PDF, XLSX, or TXT

Relevant files:

- `frontend/src/components/SetupScreen.jsx`
- `backend/routes/setup.js`
- `backend/routes/upload.js`
- `backend/services/documentParser.js`
- `backend/services/extractionAgent.js`

What happens:

1. The frontend creates or reuses a session ID from local storage.
2. The user may upload a document.
3. The backend parses the document into plain text.
4. The extraction agent converts the text into structured data such as:
   - `price_range`
   - `previous_offers`
   - `market_average`
   - `constraints`
   - `key_terms`
   - `notes`
5. The setup route sends the deal context plus extracted data into the strategist prompt.
6. The backend stores a concise playbook summary in the session.
7. The frontend shows the playbook and unlocks the live session and practice mode.

### 2. Live Session Phase

The live session is the real-time operating mode of the product.

Relevant files:

- `frontend/src/components/LiveSession.jsx`
- `frontend/src/components/TranscriptPanel.jsx`
- `frontend/src/components/WhisperCard.jsx`
- `frontend/src/components/RedFlagAlert.jsx`
- `frontend/src/hooks/useSocket.js`
- `frontend/src/hooks/useSTT.js`
- `backend/server.js`
- `backend/sockets/whisperSocket.js`
- `backend/utils/contextReducer.js`
- `backend/services/promptBuilder.js`

What happens:

1. The user logs turns manually or through speech-to-text.
2. The transcript is kept in the frontend store for UI rendering.
3. The same turns are also stored in the backend session.
4. When the hostile or opposing side speaks, the client emits `turn:them` over Socket.io.
5. The server appends that turn to the session transcript.
6. The live whisper engine reduces context to a short tactical window.
7. The backend builds a whisper prompt and sends it to the language model.
8. The model returns a structured response with:
   - `suggestion`
   - `script`
   - `tactic`
   - `confidence`
   - `power_delta`
   - `red_flag`
   - `sentiment`
   - `risk_score`
   - `reasoning`
9. The response is pushed back to the client in real time.
10. The UI updates the whisper card, tactic badge, power meter, and red flag banner.

### 3. Simulator

The simulator offers three possible strategic paths from the current deal context:

- Conservative
- Balanced
- Aggressive

Relevant files:

- `frontend/src/components/SimulatorView.jsx`
- `backend/routes/simulate.js`

The simulator is not a live loop. It is an on-demand advisory tool.

### 4. Practice Mode

Practice mode creates a realistic AI counterpart and lets the user rehearse the negotiation before the real conversation.

Relevant files:

- `frontend/src/components/PracticeMode.jsx`
- `frontend/src/components/PracticeChat.jsx`
- `backend/routes/practice.js`

What happens:

1. The backend builds a counterpart brief that opposes the user's goal.
2. The counterpart opens with a realistic negotiation anchor.
3. Each user response advances the practice transcript.
4. The backend generates the counterpart's next line.
5. The same whisper prompt pattern is reused to coach the user after each practice exchange.
6. A practice report can be generated after enough turns.

### 5. Report Phase

At the end of the live session, the app generates a post-engagement report.

Relevant files:

- `frontend/src/components/ReportScreen.jsx`
- `backend/routes/report.js`

The report summarizes:

- Overall session quality
- Wins
- Losses
- Missed opportunities
- Follow-up email
- Negotiation style
- Final power score

## Frontend Architecture

The frontend is a React 19 + Vite application with Zustand for state management.

### Main State Store

File:

- `frontend/src/store/sessionStore.js`

The store holds:

- Session ID
- Deal context
- Playbook summary
- Transcript
- Whisper history
- Current whisper
- Extracted document data
- Phase state
- Simulation data
- Practice data
- Report data
- STT and loading flags

This store is the single UI source of truth.

### Phase Routing

File:

- `frontend/src/App.jsx`

The app renders different full-screen views by `phase`:

- `setup`
- `live`
- `report`
- `practice`

This keeps routing simple and avoids a larger client-side router dependency.

### Realtime UI Components

Important components:

- `LiveSession.jsx`: live orchestration view
- `TranscriptPanel.jsx`: transcript feed
- `WhisperCard.jsx`: current AI tactical recommendation
- `TacticBadge.jsx`: current hostile tactic label
- `PowerMeter.jsx`: cumulative leverage score
- `RedFlagAlert.jsx`: high-visibility danger banner

### Speech-to-Text

File:

- `frontend/src/hooks/useSTT.js`

The frontend supports:

- Browser Web Speech API
- Deepgram, when enabled by environment variables

This allows the transcript to be captured with low friction during a live negotiation.

## Backend Architecture

The backend is an Express server with a Socket.io realtime loop and in-memory session storage.

### Server Entry

File:

- `backend/server.js`

Responsibilities:

- Start Express API
- Start Socket.io server
- Register REST routes
- Handle `turn:them` and `turn:me` events
- Initialize the LLM wrapper on startup

### Session Storage

File:

- `backend/utils/sessionStore.js`

Sessions are stored in an in-memory `Map`.

Each session contains:

- `dealContext`
- `playbookSummary`
- `transcript`
- `whispers`
- `extractedData`
- practice-related data

This is intentionally simple and fast, but it means sessions do not survive a server restart.

### Prompt Builder

File:

- `backend/services/promptBuilder.js`

This file defines the prompt templates for:

- Setup strategist
- Live whisper engine
- Report generator
- Simulator
- Practice start
- Practice respond
- Practice counterpart creation
- Practice report

This file is the heart of the product behavior because most decision logic is encoded in prompt rules.

### Model Wrapper

File:

- `backend/services/gemini.js`

Despite the filename, the current implementation primarily uses Groq-compatible chat completions and keeps the old function names for compatibility.

The wrapper is responsible for:

- Model initialization
- Calling the selected model
- Enforcing JSON response format when needed
- Applying a fallback model when possible
- Parsing returned JSON safely

## Data Contracts

Key files:

- `backend/contracts.js`
- `frontend/src/contracts.js`

These files mirror key tactical values such as:

- Valid tactic names
- Fallback whisper object
- Shared response shape expectations

The backend is the source of truth for emitted whisper responses, while the frontend mirrors the same values for rendering.

## Short-Term Memory and Live Contradiction Detection

The live whisper engine is intentionally lightweight. It does not attempt to load the full transcript into the model on every turn.

Instead it uses:

- A reduced recent transcript window
- A compact claim-memory summary of recent claim-like hostile turns

Relevant files:

- `backend/utils/contextReducer.js`
- `backend/services/promptBuilder.js`
- `frontend/src/components/RedFlagAlert.jsx`

### How it works

1. The backend stores the full transcript for the session.
2. For each hostile turn, the whisper engine sends only the latest tactical context to the model.
3. The reducer now also captures a compact memory of prior hostile claims that look important, especially claims involving:
   - prices
   - ranges
   - budgets
   - rates
   - timelines
   - approval status
   - exclusivity
   - constraints
4. The prompt explicitly instructs the model to compare the latest hostile statement against both the recent turns and the claim memory.
5. If the other party materially changes or denies an earlier number or key term without explaining the change, the model is instructed to:
   - set `red_flag` to `true`
   - set `tactic` to `contradiction`
   - raise the risk score
   - produce reasoning that names both the earlier claim and the latest conflicting claim
6. The existing red flag banner uses that reasoning to display a more specific warning in the live UI.

### Why this is useful

This improves the assistant in a practical way without changing the product architecture:

- No new route was added
- No store structure was broken
- No new panel was introduced
- The existing banner system remains the alert mechanism

## Current Strengths

- Clear separation between setup, live support, practice, simulation, and reporting
- Fast realtime loop with Socket.io
- Small context windows that keep latency manageable
- Upload-to-structured-data path for document-led negotiations
- Practice mode reuses the same tactical engine instead of duplicating logic
- Minimal frontend state architecture with Zustand

## Current Limitations

### 1. In-memory persistence only

Sessions disappear on backend restart. There is no database yet.

### 2. Prompt-driven detection

Many tactical judgments still depend on prompt quality and model reliability rather than deterministic rule engines.

### 3. Limited structured contradiction logic

The new contradiction detection is a strong improvement, but it is still model-assisted rather than a full symbolic fact checker.

### 4. Contracts are partly documentary

The contracts files act more like shared documentation than enforced runtime schemas.

### 5. Some tactic vocabularies are broader in prompts than in mirrored contracts

The system works, but the prompt vocabulary and mirrored labels should be kept aligned over time.

## Suggested Next Evolutions

If the project grows, these would be the highest-value improvements:

1. Add persistent session storage with Redis or Postgres.
2. Add structured extraction of offers and concessions into explicit session facts.
3. Add automated tests for prompt-building and whisper parsing.
4. Add a dedicated contradiction or fact-history panel in the UI.
5. Add replay tooling for transcripts so model behavior can be debugged after the fact.
6. Add stronger schema validation for model responses.

## Environment and Runtime Notes

### Frontend

- Vite-based React application
- Uses Axios, Zustand, Lucide, Socket.io client

### Backend

- Express server
- Socket.io
- Multer for uploads
- `pdf-parse` for PDF reading
- `xlsx` for spreadsheet parsing
- Groq-compatible model calls via the shared LLM wrapper

### Important environment variables

Based on the codebase, common configuration points include:

- `CLIENT_URL`
- `PORT`
- `GROQ_API_KEY`
- `GEMINI_API_KEY` for older compatibility paths
- `VITE_SOCKET_URL`
- `VITE_USE_DEEPGRAM`
- `VITE_DEEPGRAM_KEY`

## File Map for Quick Orientation

### Frontend

- `frontend/src/App.jsx`: top-level phase switch
- `frontend/src/store/sessionStore.js`: central UI state
- `frontend/src/components/SetupScreen.jsx`: initial mission parameters
- `frontend/src/components/LiveSession.jsx`: live transcript workspace
- `frontend/src/components/RedFlagAlert.jsx`: realtime danger banner
- `frontend/src/components/WhisperCard.jsx`: tactical recommendation UI
- `frontend/src/components/PracticeMode.jsx`: negotiation rehearsal
- `frontend/src/components/ReportScreen.jsx`: post-session analytics
- `frontend/src/hooks/useSocket.js`: realtime client hook
- `frontend/src/hooks/useSTT.js`: speech-to-text integration

### Backend

- `backend/server.js`: server bootstrap
- `backend/utils/sessionStore.js`: in-memory sessions
- `backend/sockets/whisperSocket.js`: live hostile-turn analysis
- `backend/utils/contextReducer.js`: short tactical memory
- `backend/services/promptBuilder.js`: prompt definitions
- `backend/services/gemini.js`: model wrapper
- `backend/routes/setup.js`: strategist route
- `backend/routes/upload.js`: file upload and extraction route
- `backend/routes/simulate.js`: scenario simulator
- `backend/routes/practice.js`: practice mode engine
- `backend/routes/report.js`: final report generation

## Summary

DealRoom is a negotiation copilot with a tactical UI and a modular AI backend. Its architecture is intentionally simple:

- a React client for the user experience
- an Express + Socket.io server for orchestration
- an in-memory session model for speed
- prompt-specialized AI calls for each product mode

The project already supports preparation, live whisper coaching, document extraction, simulation, practice, and reporting. The latest live improvement adds compact claim memory and contradiction-aware red flag detection so the system is better at catching unexplained reversals like a price suddenly shifting from one number to another during the conversation.
