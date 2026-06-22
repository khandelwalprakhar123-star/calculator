"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

const KEYS = [
  "C", "⌫", ".", "÷",
  "7", "8", "9", "×",
  "4", "5", "6", "−",
  "1", "2", "3", "+",
  "0", "=",
];

const OPERATORS = ["÷", "×", "−", "+"];
const DIGITS = "0123456789";

type CalcState = {
  display: string;
  previous: number | null;
  operator: string | null;
  overwrite: boolean;
};

const INITIAL: CalcState = {
  display: "0",
  previous: null,
  operator: null,
  overwrite: false,
};

// Do the actual arithmetic. Returns NaN for divide-by-zero so we can show "Error".
function compute(a: number, op: string, b: number): number {
  switch (op) {
    case "+": return a + b;
    case "−": return a - b;
    case "×": return a * b;
    case "÷": return b === 0 ? NaN : a / b;
    default: return b;
  }
}

// Turn a raw number into a clean display string (kills floating-point dust).
function format(n: number): string {
  if (!isFinite(n)) return "Error";
  return String(Math.round((n + Number.EPSILON) * 1e10) / 1e10);
}

// Solve ax² + bx + c = 0 for x, reusing format() to keep numbers clean.
// Handles the three discriminant cases (two real, one repeated, complex) and
// guards the degenerate a === 0 case (which isn't actually quadratic).
function solveQuadratic(a: number, b: number, c: number): string {
  if (!isFinite(a) || !isFinite(b) || !isFinite(c)) return "Enter a, b, c";
  if (a === 0) return "Not quadratic (a = 0)";

  const disc = b * b - 4 * a * c;
  const twoA = 2 * a;

  if (disc < 0) {
    // Complex roots: -b/2a ± (√|disc|/2a)i
    const re = format(-b / twoA);
    const im = format(Math.sqrt(-disc) / twoA);
    return `x = ${re} ± ${im}i`;
  }

  const root = Math.sqrt(disc);
  const x1 = format((-b + root) / twoA);
  if (disc === 0) return `x = ${x1}`; // one repeated root
  const x2 = format((-b - root) / twoA);
  return `x = ${x1}, ${x2}`;
}

// Render ax² + bx + c with the coefficients substituted in and the signs
// tidied up, e.g. (2, -3, 1) → "2x² − 3x + 1". Uses the same minus glyph as
// the keypad so it matches the rest of the UI.
function formatQuadExpr(a: number, b: number, c: number): string {
  const bSign = b < 0 ? "−" : "+";
  const cSign = c < 0 ? "−" : "+";
  return `${format(a)}x² ${bSign} ${format(Math.abs(b))}x ${cSign} ${format(Math.abs(c))}`;
}

// Pure function: given the current state and a key, return the NEXT state.
// It never reads anything outside its arguments, which is what makes the
// keyboard wiring below safe and simple.
function reduce(state: CalcState, key: string): CalcState {
  const { display, previous, operator, overwrite } = state;

  if (key === "C") return INITIAL;

  if (key === "⌫") {
    if (overwrite || display.length === 1) return { ...state, display: "0", overwrite: false };
    return { ...state, display: display.slice(0, -1) };
  }

  if (DIGITS.includes(key)) {
    if (overwrite) return { ...state, display: key, overwrite: false };
    return { ...state, display: display === "0" ? key : display + key };
  }

  if (key === ".") {
    if (overwrite) return { ...state, display: "0.", overwrite: false };
    if (display.includes(".")) return state;
    return { ...state, display: display + "." };
  }

  if (OPERATORS.includes(key)) {
    const current = parseFloat(display);
    // If an operation is already pending, fold it first so chains like
    // 2 + 3 + 4 work as you go.
    if (operator !== null && previous !== null && !overwrite) {
      const result = compute(previous, operator, current);
      return { display: format(result), previous: result, operator: key, overwrite: true };
    }
    return { ...state, previous: current, operator: key, overwrite: true };
  }

  if (key === "=") {
    if (operator === null || previous === null) return state;
    const result = compute(previous, operator, parseFloat(display));
    return { display: format(result), previous: null, operator: null, overwrite: true };
  }

  return state;
}

const HISTORY_LIMIT = 10;

// The label our history is filed under in the browser's localStorage notebook.
const STORAGE_KEY = "calc.history";

// Quadratic history lives in its own slot, same last-10 limit.
const STORAGE_KEY_QUAD = "calc.quadHistory";

// Function-tab history (logs, exponents, Euler's number) — its own slot too.
const STORAGE_KEY_FUNC = "calc.funcHistory";

// The whole app's state: the calculator plus a log of completed calculations.
type AppState = {
  calc: CalcState;
  history: string[];
};

const INITIAL_APP: AppState = { calc: INITIAL, history: [] };

// Advance the app by one key. Delegates the math to reduce(), and when an
// "=" actually completes a calculation it prepends a "a op b = result" line
// to the history (newest first, capped at HISTORY_LIMIT). Clearing with "C"
// resets the calculator but deliberately keeps the history.
function step(app: AppState, key: string): AppState {
  const calc = reduce(app.calc, key);
  const { previous, operator, display } = app.calc;

  if (key === "=" && operator !== null && previous !== null) {
    const b = parseFloat(display);
    const result = compute(previous, operator, b);
    const entry = `${format(previous)} ${operator} ${format(b)} = ${format(result)}`;
    return { calc, history: [entry, ...app.history].slice(0, HISTORY_LIMIT) };
  }

  return { ...app, calc };
}

// ---- Floating windows: drag any panel anywhere, desktop-style ----

// Turns a panel into a free-floating, draggable window. Tracks an (x, y)
// offset from screen-center and a z-index; the most recently grabbed window
// rises to the top. There are deliberately no boundaries — drag it as far as
// you like, on or off screen, overlapping the others (panels are opaque).
function useDraggable(
  initial: { x: number; y: number },
  zRef: { current: number },
) {
  const [pos, setPos] = useState(initial);
  const [z, setZ] = useState(() => (zRef.current += 1));

  // Raise this window above every other one.
  function bringToFront() {
    if (z === zRef.current) return; // already frontmost — nothing to do
    zRef.current += 1;
    setZ(zRef.current);
  }

  // Start a drag from the window's handle (its header bar). We listen on
  // window, not the element, so the drag keeps tracking even if the pointer
  // briefly outruns the panel.
  function onDragStart(e: ReactPointerEvent) {
    bringToFront();
    const offsetX = e.clientX - pos.x;
    const offsetY = e.clientY - pos.y;

    function move(ev: PointerEvent) {
      setPos({ x: ev.clientX - offsetX, y: ev.clientY - offsetY });
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.userSelect = "";
    }

    document.body.style.userSelect = "none"; // don't select text mid-drag
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // Centered via left/top 50% so the initial position needs no viewport math
  // (works on the server too); the offset is then layered on as a translate.
  const style: CSSProperties = {
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
    zIndex: z,
  };

  return { style, bringToFront, onDragStart };
}

// Track a CSS media query in React. SSR-safe: it reports false on the server
// and during the first client paint, then syncs to the real match on mount —
// so the markup the server sends always agrees with the first client render.
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

// One panel, two personalities. On a wide screen it's a free-floating,
// draggable window (via useDraggable). On anything narrower the desktop
// metaphor falls apart — fixed pixel offsets would push panels off-screen — so
// it becomes a centered modal sheet with a tap-to-dismiss backdrop instead.
function Floating({
  isDesktop,
  win,
  width,
  onClose,
  children,
}: {
  isDesktop: boolean;
  win: { style: CSSProperties; bringToFront: () => void };
  width: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (isDesktop) {
    return (
      <div style={win.style} onPointerDown={win.bringToFront} className={width}>
        {children}
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative max-w-full ${width}`}>{children}</div>
    </div>
  );
}

export default function Home() {
  const [app, setApp] = useState<AppState>(INITIAL_APP);
  const [flash, setFlash] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSolver, setShowSolver] = useState(false);
  const [coeffs, setCoeffs] = useState({ a: "", b: "", c: "" });
  const [roots, setRoots] = useState<string | null>(null);
  const [quadHistory, setQuadHistory] = useState<string[]>([]);
  const [showFunctions, setShowFunctions] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [funcInputs, setFuncInputs] = useState({ x: "", y: "" });
  // The chained "running result": each function acts on this if it's set, so
  // ops compose (e.g. xʸ then log). null means no value carried yet.
  const [funcResult, setFuncResult] = useState<number | null>(null);
  const [funcTrail, setFuncTrail] = useState<string | null>(null);
  const [funcHistory, setFuncHistory] = useState<string[]>([]);
  // Word-problem (DeepSeek) panel: the textarea text, an in-flight flag while
  // we wait on the server, the worked answer, and any error to surface.
  const [problem, setProblem] = useState("");
  const [solving, setSolving] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  // The raw upstream error body (e.g. Gemini's quota explanation), shown under
  // the short error message so failures are self-explanatory.
  const [aiDetail, setAiDetail] = useState<string | null>(null);
  const { calc: state, history } = app;

  // Above this width we keep the desktop "floating draggable windows" feel;
  // below it everything collapses into a tidy, centered single-column layout.
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // One draggable window each. The shared counter (zRef) decides stacking
  // order so the last-touched window comes to the front. Panels start offset
  // to the right of the calculator so they're visible when first opened.
  const zRef = useRef(30);
  const calcWin = useDraggable({ x: 0, y: 0 }, zRef);
  const historyWin = useDraggable({ x: 360, y: 0 }, zRef);
  const solverWin = useDraggable({ x: 392, y: 48 }, zRef);
  const functionsWin = useDraggable({ x: 424, y: 96 }, zRef);
  // Opens to the left of the calculator since its toggle lives top-left.
  const aiWin = useDraggable({ x: -424, y: 96 }, zRef);

  // One entry point for every key, whether clicked or typed.
  function press(key: string) {
    setApp((a) => step(a, key));
    setFlash(key);
  }

  // Send the typed word problem to our own server route, which relays it to
  // DeepSeek and returns the worked answer. We never call DeepSeek directly
  // from here — that would leak the API key into the browser.
  async function solveProblem() {
    const trimmed = problem.trim();
    if (trimmed === "" || solving) return; // nothing to do / already running

    setSolving(true);
    setAiError(null);
    setAiDetail(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/word-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error ?? "Something went wrong.");
        setAiDetail(data.detail ?? null);
      } else {
        setAnswer(data.answer);
      }
    } catch {
      setAiError("Network error — is the dev server running?");
    } finally {
      setSolving(false);
    }
  }

  // Listen for real keyboard presses while this component is on screen.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Don't hijack keystrokes meant for a text field (e.g. the quadratic
      // solver's a/b/c inputs, or the word-problem textarea) — let them type
      // normally. Inputs and textareas are different element types, so check
      // both.
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const k = e.key;
      let mapped: string | null = null;

      if (k >= "0" && k <= "9") mapped = k;
      else if (k === ".") mapped = ".";
      else if (k === "+") mapped = "+";
      else if (k === "-") mapped = "−";
      else if (k === "*") mapped = "×";
      else if (k === "/") mapped = "÷";
      else if (k === "Enter" || k === "=") mapped = "=";
      else if (k === "Escape") mapped = "C";
      else if (k === "Backspace") mapped = "⌫";

      if (mapped === null) return;
      e.preventDefault();
      press(mapped);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Briefly highlight whichever key was last pressed (nice for keyboard feedback).
  useEffect(() => {
    if (flash === null) return;
    const id = setTimeout(() => setFlash(null), 120);
    return () => clearTimeout(id);
  }, [flash]);

  // ---- localStorage (the "notebook"): persist history across reloads ----

  // LOAD: once, after the page opens in the browser. Reads the saved text from
  // the notebook and unpacks it back into the history list on the whiteboard.
  // Runs in an effect (not during render) so it only ever touches localStorage
  // in the browser, never on the server where localStorage doesn't exist.
  useEffect(() => {
    try {
      const text = localStorage.getItem(STORAGE_KEY);
      if (text) {
        const saved = JSON.parse(text) as string[];
        setApp((a) => ({ ...a, history: saved }));
      }
    } catch {
      // Missing, corrupted, or unavailable storage → just start with no history.
    }
  }, []);

  // SAVE: whenever the history changes, pack the list into text and file it in
  // the notebook. We skip the very first run so the initial empty list doesn't
  // overwrite saved data before LOAD has had a chance to restore it.
  const isFirstSave = useRef(true);
  useEffect(() => {
    if (isFirstSave.current) {
      isFirstSave.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Storage full or disabled → ignore; history simply won't persist.
    }
  }, [history]);

  // Same load/save dance for the quadratic history, in its own storage slot.
  useEffect(() => {
    try {
      const text = localStorage.getItem(STORAGE_KEY_QUAD);
      if (text) setQuadHistory(JSON.parse(text) as string[]);
    } catch {
      // Missing or corrupt → start empty.
    }
  }, []);

  const isFirstQuadSave = useRef(true);
  useEffect(() => {
    if (isFirstQuadSave.current) {
      isFirstQuadSave.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY_QUAD, JSON.stringify(quadHistory));
    } catch {
      // Ignore — quadratic history just won't persist.
    }
  }, [quadHistory]);

  // …and once more for the function-tab history.
  useEffect(() => {
    try {
      const text = localStorage.getItem(STORAGE_KEY_FUNC);
      if (text) setFuncHistory(JSON.parse(text) as string[]);
    } catch {
      // Missing or corrupt → start empty.
    }
  }, []);

  const isFirstFuncSave = useRef(true);
  useEffect(() => {
    if (isFirstFuncSave.current) {
      isFirstFuncSave.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY_FUNC, JSON.stringify(funcHistory));
    } catch {
      // Ignore — function history just won't persist.
    }
  }, [funcHistory]);

  // Apply one of the four function-tab operations. The two unary ops (ln, log)
  // act on the running result when one exists, otherwise on the x field — that
  // single rule is what lets the functions work both independently ("log of 4")
  // and chained together ("4 squared, then log"). xʸ always reads both fields;
  // "e" simply loads Euler's number as the running value so it can be fed on.
  function applyFunc(kind: "pow" | "ln" | "log10" | "e") {
    const x = parseFloat(funcInputs.x);
    const y = parseFloat(funcInputs.y);
    let value: number;
    let label: string;

    if (kind === "pow") {
      value = Math.pow(x, y);
      label = `${format(x)} ^ ${format(y)}`;
    } else if (kind === "e") {
      value = Math.E;
      label = "e";
    } else {
      const operand = funcResult !== null ? funcResult : x;
      const operandLabel = format(operand);
      if (kind === "ln") {
        value = Math.log(operand);
        label = `ln(${operandLabel})`;
      } else {
        value = Math.log10(operand);
        label = `log(${operandLabel})`;
      }
    }

    const entry = `${label} = ${format(value)}`;
    setFuncResult(value);
    setFuncTrail(entry);
    setFuncHistory((h) => [entry, ...h].slice(0, HISTORY_LIMIT));
  }

  function keyClass(key: string) {
    if (key === "C") return "key-clear";
    if (key === "=") return "key-equals";
    if (key === "⌫" || OPERATORS.includes(key)) return "key-op";
    return "key-digit";
  }

  const expression =
    state.previous !== null && state.operator
      ? `${format(state.previous)} ${state.operator}`
      : "";

  return (
    <main className="flex flex-1 items-center justify-center px-4 pb-6 pt-16 sm:px-6 lg:pt-6">
      {/* Page-level history toggle, pinned to the top-right of the window */}
      <button
        onClick={() => setShowHistory(true)}
        aria-label="Show history"
        className="fixed right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 backdrop-blur transition-colors hover:border-amber-400/40 hover:text-amber-400/90 sm:right-5 sm:top-5 sm:h-10 sm:w-10"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </button>

      {/* Quadratic solver toggle, pinned just below the history button */}
      <button
        onClick={() => setShowSolver(true)}
        aria-label="Quadratic solver"
        className="fixed right-3 top-[52px] z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 font-mono text-sm font-semibold text-white/50 backdrop-blur transition-colors hover:border-amber-400/40 hover:text-amber-400/90 sm:right-5 sm:top-[68px] sm:h-10 sm:w-10"
      >
        x²
      </button>

      {/* Functions toggle (logs / exponents / e), pinned below the solver button */}
      <button
        onClick={() => setShowFunctions(true)}
        aria-label="Functions"
        className="fixed right-3 top-[92px] z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 backdrop-blur transition-colors hover:border-amber-400/40 hover:text-amber-400/90 sm:right-5 sm:top-[116px] sm:h-10 sm:w-10"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" />
          <path d="M6.453 15h11.094" />
          <path d="M8.5 2h7" />
        </svg>
      </button>

      {/* Word-problem (AI) toggle, pinned to the top-left. A little robot:
          a rounded rectangle head with two antennas, dot eyes and a smile. */}
      <button
        onClick={() => setShowAI(true)}
        aria-label="Word problems"
        className="fixed left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 backdrop-blur transition-colors hover:border-amber-400/40 hover:text-amber-400/90 sm:left-5 sm:top-5 sm:h-10 sm:w-10"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          {/* antennas */}
          <path d="M8 8V5" />
          <path d="M16 8V5" />
          <path d="M8 4h0" />
          <path d="M16 4h0" />
          {/* head */}
          <rect x="4" y="8" width="16" height="11" rx="2" />
          {/* eyes */}
          <path d="M9 13h0" />
          <path d="M15 13h0" />
          {/* smile */}
          <path d="M9.5 16q2.5 1.6 5 0" />
        </svg>
      </button>

      {/* Calculator: a draggable window on desktop; a centered card on mobile. */}
      <div
        style={isDesktop ? calcWin.style : undefined}
        onPointerDown={isDesktop ? calcWin.bringToFront : undefined}
        className="w-full max-w-[20rem]"
      >
      <div className="device w-full p-4 sm:p-5">
        {/* Header doubles as the drag handle on desktop — grab it to move the window */}
        <div
          onPointerDown={isDesktop ? calcWin.onDragStart : undefined}
          className={`mb-3 flex touch-none select-none items-center justify-between px-1 sm:mb-5 ${isDesktop ? "cursor-grab active:cursor-grabbing" : ""}`}
        >
          <Link
            href="/"
            onPointerDown={(e) => e.stopPropagation()}
            className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500/80 transition-colors hover:text-amber-400"
          >
            CalcU
          </Link>
          <div className="flex gap-1">
            <span className="h-1 w-1 rounded-full bg-white/15" />
            <span className="h-1 w-1 rounded-full bg-white/15" />
            <span className="h-1 w-1 rounded-full bg-white/15" />
          </div>
        </div>

        {/* Screen */}
        <div className="screen mb-3 px-4 py-4 sm:mb-5 sm:px-5 sm:py-6">
          <div className="mb-1 h-4 text-right font-mono text-xs text-emerald-200/30">
            {expression || " "}
          </div>
          <div className="screen-value truncate text-right text-4xl font-medium tracking-tight sm:text-5xl">
            {state.display}
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {KEYS.map((key) => (
            <button
              key={key}
              onClick={() => press(key)}
              className={`key ${keyClass(key)} ${flash === key ? "key-flash" : ""} ${key === "0" || key === "=" ? "col-span-2" : ""} h-12 text-xl font-medium sm:h-16 sm:text-2xl`}
            >
              {key}
            </button>
          ))}
        </div>

        <p className="mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-white/25 sm:mt-4">
          Tip: your keyboard works too
        </p>
      </div>
      </div>

      {/* History: an independent draggable window. Grab its header to move it;
          it can overlap the calculator and solver (panels are opaque). */}
      {showHistory && (
        <Floating
          isDesktop={isDesktop}
          win={historyWin}
          width="w-[52rem]"
          onClose={() => setShowHistory(false)}
        >
        <aside className="device flex h-[80vh] max-h-[88vh] w-full flex-col p-5">
          {/* Header doubles as the drag handle on desktop. Close lives here;
              each partition below carries its own Clear. */}
          <div
            onPointerDown={isDesktop ? historyWin.onDragStart : undefined}
            className={`mb-4 flex touch-none select-none items-center justify-between px-1 ${isDesktop ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500/80">
              History
            </span>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setShowHistory(false)}
              aria-label="Close history"
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Three partitions side by side: standard calculations, quadratics,
              and functions. All columns stretch to the same height and each
              caps at HISTORY_LIMIT entries. */}
          <div className="flex min-h-0 flex-1 gap-4">
          {/* Partition 1 — standard calculator history (unchanged format) */}
          <section className="flex min-h-0 flex-1 flex-col">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/35">
                Calculations
              </span>
              {history.length > 0 && (
                <button
                  onClick={() => setApp((a) => ({ ...a, history: [] }))}
                  className="text-[10px] uppercase tracking-[0.2em] text-white/30 transition-colors hover:text-rose-400/70"
                >
                  Clear
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-xs uppercase tracking-[0.2em] text-white/25">
                No calculations yet
              </div>
            ) : (
              <ul className="flex-1 space-y-2 overflow-y-auto pr-1">
                {history.map((entry, i) => (
                  <li
                    key={i}
                    className="screen truncate px-4 py-3 text-right font-mono text-sm text-emerald-200/70"
                  >
                    {entry}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Divider between the two side-by-side partitions */}
          <div className="w-px shrink-0 bg-white/10" />

          {/* Partition 2 — quadratic history. Each entry is exactly two lines
              ("ax² + bx + c" then the coefficients) with no gap between
              consecutive entries. Capped at the same HISTORY_LIMIT. */}
          <section className="flex min-h-0 flex-1 flex-col">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/35">
                Quadratics
              </span>
              {quadHistory.length > 0 && (
                <button
                  onClick={() => setQuadHistory([])}
                  className="text-[10px] uppercase tracking-[0.2em] text-white/30 transition-colors hover:text-rose-400/70"
                >
                  Clear
                </button>
              )}
            </div>
            {quadHistory.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-xs uppercase tracking-[0.2em] text-white/25">
                No quadratics yet
              </div>
            ) : (
              <div className="screen flex-1 overflow-y-auto px-4 py-3 font-mono text-sm leading-snug text-emerald-200/70">
                {quadHistory.map((entry, i) => (
                  <div key={i} className="whitespace-pre-line">
                    {entry}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Divider before the third partition */}
          <div className="w-px shrink-0 bg-white/10" />

          {/* Partition 3 — function history (one line per op, e.g. "ln(16) = …"),
              newest first, capped at the same HISTORY_LIMIT. */}
          <section className="flex min-h-0 flex-1 flex-col">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/35">
                Functions
              </span>
              {funcHistory.length > 0 && (
                <button
                  onClick={() => setFuncHistory([])}
                  className="text-[10px] uppercase tracking-[0.2em] text-white/30 transition-colors hover:text-rose-400/70"
                >
                  Clear
                </button>
              )}
            </div>
            {funcHistory.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-xs uppercase tracking-[0.2em] text-white/25">
                No functions yet
              </div>
            ) : (
              <ul className="flex-1 space-y-2 overflow-y-auto pr-1">
                {funcHistory.map((entry, i) => (
                  <li
                    key={i}
                    className="screen truncate px-4 py-3 text-right font-mono text-sm text-emerald-200/70"
                  >
                    {entry}
                  </li>
                ))}
              </ul>
            )}
          </section>
          </div>
        </aside>
        </Floating>
      )}

      {/* Quadratic solver: a draggable window on desktop, a modal sheet on
          mobile. Collects a, b, c and solves with solveQuadratic(). */}
      {showSolver && (
        <Floating
          isDesktop={isDesktop}
          win={solverWin}
          width="w-72"
          onClose={() => setShowSolver(false)}
        >
        <aside className="device flex max-h-[80vh] w-full flex-col p-5">
          <div
            onPointerDown={isDesktop ? solverWin.onDragStart : undefined}
            className={`mb-4 flex touch-none select-none items-center justify-between px-1 ${isDesktop ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500/80">
              Quadratic
            </span>
            <button
              onClick={() => setShowSolver(false)}
              aria-label="Close solver"
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="mb-4 text-center font-mono text-sm text-emerald-200/50">
            ax² + bx + c = 0
          </p>

          <div className="space-y-3">
            {(["a", "b", "c"] as const).map((k) => (
              <div key={k} className="flex items-center gap-3">
                <span className="w-4 font-mono text-sm text-white/40">{k}</span>
                <input
                  value={coeffs[k]}
                  onChange={(e) =>
                    setCoeffs((prev) => ({ ...prev, [k]: e.target.value }))
                  }
                  placeholder="0"
                  inputMode="decimal"
                  className="screen w-full bg-transparent px-4 py-3 text-right font-mono text-lg text-emerald-200/80 outline-none placeholder:text-emerald-200/20"
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              const a = parseFloat(coeffs.a);
              const b = parseFloat(coeffs.b);
              const c = parseFloat(coeffs.c);
              const solved = solveQuadratic(a, b, c);
              setRoots(solved);
              // Record the entry newest-first, capped at HISTORY_LIMIT — only
              // once all three coefficients actually parse to numbers. Each
              // entry is the expression with a, b, c substituted in, then the
              // value(s) of x, then a trailing blank line reserved for a future
              // second segment.
              if (isFinite(a) && isFinite(b) && isFinite(c)) {
                const entry = `${formatQuadExpr(a, b, c)}\n${solved}\n`;
                setQuadHistory((h) => [entry, ...h].slice(0, HISTORY_LIMIT));
              }
            }}
            className="key key-equals mt-4 h-12 w-full text-lg font-medium"
          >
            Solve
          </button>

          {roots && (
            <div className="screen mt-4 px-4 py-3 text-right font-mono text-sm text-emerald-200/70">
              {roots}
            </div>
          )}
        </aside>
        </Floating>
      )}

      {/* Functions: logarithms, exponents (xʸ) and Euler's number. Enter x and
          y, then tap an op; each op feeds the running result so they compose. */}
      {showFunctions && (
        <Floating
          isDesktop={isDesktop}
          win={functionsWin}
          width="w-72"
          onClose={() => setShowFunctions(false)}
        >
        <aside className="device flex max-h-[80vh] w-full flex-col p-5">
          <div
            onPointerDown={isDesktop ? functionsWin.onDragStart : undefined}
            className={`mb-4 flex touch-none select-none items-center justify-between px-1 ${isDesktop ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500/80">
              Functions
            </span>
            <button
              onClick={() => setShowFunctions(false)}
              aria-label="Close functions"
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="mb-4 text-center font-mono text-sm text-emerald-200/50">
            logarithms · exponents · e
          </p>

          <div className="space-y-3">
            {(["x", "y"] as const).map((k) => (
              <div key={k} className="flex items-center gap-3">
                <span className="w-4 font-mono text-sm text-white/40">{k}</span>
                <input
                  value={funcInputs[k]}
                  onChange={(e) =>
                    setFuncInputs((prev) => ({ ...prev, [k]: e.target.value }))
                  }
                  placeholder="0"
                  inputMode="decimal"
                  className="screen w-full bg-transparent px-4 py-3 text-right font-mono text-lg text-emerald-200/80 outline-none placeholder:text-emerald-200/20"
                />
              </div>
            ))}
          </div>

          {/* Op buttons. xʸ uses both fields; ln/log act on the running result
              (or x if none yet); e loads Euler's number. */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <button onClick={() => applyFunc("pow")} className="key key-op h-12 text-base font-medium">xʸ</button>
            <button onClick={() => applyFunc("ln")} className="key key-op h-12 text-base font-medium">ln</button>
            <button onClick={() => applyFunc("log10")} className="key key-op h-12 text-base font-medium">log</button>
            <button onClick={() => applyFunc("e")} className="key key-op h-12 text-base font-medium">e</button>
          </div>

          {funcTrail && (
            <div className="screen mt-4 px-4 py-3 text-right font-mono text-sm text-emerald-200/70">
              {funcTrail}
            </div>
          )}

          <button
            onClick={() => {
              setFuncResult(null);
              setFuncTrail(null);
            }}
            className="mt-3 self-center text-[10px] uppercase tracking-[0.2em] text-white/30 transition-colors hover:text-rose-400/70"
          >
            Reset result
          </button>
        </aside>
        </Floating>
      )}

      {/* Word problems (AI): a draggable window on desktop, a modal sheet on
          mobile. Placeholder for now — the DeepSeek-backed solver lands here. */}
      {showAI && (
        <Floating
          isDesktop={isDesktop}
          win={aiWin}
          width="w-72"
          onClose={() => setShowAI(false)}
        >
        <aside className="device flex max-h-[80vh] w-full flex-col p-5">
          <div
            onPointerDown={isDesktop ? aiWin.onDragStart : undefined}
            className={`mb-4 flex touch-none select-none items-center justify-between px-1 ${isDesktop ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500/80">
              Word Problems
            </span>
            <button
              onClick={() => setShowAI(false)}
              aria-label="Close word problems"
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="mb-3 text-center font-mono text-xs text-emerald-200/40">
            Describe a problem in words — Gemini solves it.
          </p>

          {/* The input: a multi-line box for the problem text. */}
          <textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            rows={3}
            placeholder="A train travels 60 miles in 1.5 hours. What is its average speed?"
            className="screen w-full resize-none bg-transparent px-4 py-3 font-mono text-sm text-emerald-200/80 outline-none placeholder:text-emerald-200/20"
          />

          {/* Submit. Disabled while a request is in flight or the box is empty. */}
          <button
            onClick={solveProblem}
            disabled={solving || problem.trim() === ""}
            className="key key-equals mt-3 h-12 w-full text-base font-medium disabled:opacity-40"
          >
            {solving ? "Solving…" : "Solve"}
          </button>

          {/* Result OR error — only one shows at a time. */}
          {aiError && (
            <div className="screen mt-3 px-4 py-3 font-mono text-sm text-rose-300/80">
              <div>{aiError}</div>
              {aiDetail && (
                <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap border-t border-rose-300/15 pt-2 text-[11px] leading-snug text-rose-300/50">
                  {aiDetail}
                </pre>
              )}
            </div>
          )}
          {answer && (
            <div className="screen mt-3 max-h-48 overflow-y-auto whitespace-pre-line px-4 py-3 font-mono text-sm leading-snug text-emerald-200/70">
              {answer}
            </div>
          )}
        </aside>
        </Floating>
      )}
    </main>
  );
}
