import Link from "next/link";
import type { ReactNode } from "react";

// The keypad, mirrored from the real calculator so the hero shows the actual
// object rather than a stand-in. Static here — the whole device links through.
const KEYS = [
  "C", "⌫", ".", "÷",
  "7", "8", "9", "×",
  "4", "5", "6", "−",
  "1", "2", "3", "+",
  "0", "=",
];
const OPERATORS = ["÷", "×", "−", "+"];

function keyClass(key: string) {
  if (key === "C") return "key-clear";
  if (key === "=") return "key-equals";
  if (key === "⌫" || OPERATORS.includes(key)) return "key-op";
  return "key-digit";
}

// A faithful, non-interactive replica of the calculator. `expression` and
// `value` fill the screen; the real thing lives one click away.
function DeviceMock({
  expression,
  value,
  className = "",
}: {
  expression: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`device w-full p-4 sm:p-5 ${className}`}>
      <div className="mb-3 flex items-center justify-between px-1 sm:mb-5">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500/80">
          CalcU
        </span>
        <div className="flex gap-1">
          <span className="h-1 w-1 rounded-full bg-white/15" />
          <span className="h-1 w-1 rounded-full bg-white/15" />
          <span className="h-1 w-1 rounded-full bg-white/15" />
        </div>
      </div>

      <div className="screen mb-3 px-4 py-4 sm:mb-5 sm:px-5 sm:py-6">
        <div className="mb-1 h-4 text-right font-mono text-xs text-emerald-200/40">
          {expression}
        </div>
        <div className="screen-value truncate text-right text-4xl font-medium tracking-tight sm:text-5xl">
          {value}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {KEYS.map((key) => (
          <div
            key={key}
            aria-hidden
            className={`key ${keyClass(key)} ${
              key === "0" || key === "=" ? "col-span-2" : ""
            } flex h-12 items-center justify-center text-xl font-medium sm:h-14 sm:text-2xl`}
          >
            {key}
          </div>
        ))}
      </div>
    </div>
  );
}

// A scaled-down device used inside the "your desk" showcase, so several windows
// can overlap without dominating. Header bar + screen only — the keypad is
// implied by a few rows so the composition stays light.
function MiniPanel({
  title,
  children,
  className = "",
  style,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`device p-4 ${className}`} style={style}>
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-500/80">
          {title}
        </span>
        <span className="flex h-5 w-5 items-center justify-center rounded-full text-white/30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-3 w-3">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </span>
      </div>
      {children}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="relative flex flex-1 flex-col">
      {/* ---- Nav ---- */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0b0b0d]/75 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="wordmark text-base font-semibold tracking-tight text-stone-100"
          >
            Calc<span className="text-amber-400">U</span>
          </Link>
          <Link
            href="/calculator"
            className="cta-ghost px-4 py-2 text-sm font-medium"
          >
            Open calculator
          </Link>
        </nav>
      </header>

      {/* ---- Hero ---- */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pt-16 pb-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pt-24 lg:pb-28">
        <div className="anim-rise max-w-xl">
          <h1 className="wordmark text-balance text-[clamp(2.75rem,6vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-stone-50">
            A calculator
            <br />
            you can feel.
          </h1>
          <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-stone-300">
            CalcU brings the heft of desktop hardware to the browser. Keys that
            press, a screen that glows, and every tool in its own window you can
            drag wherever it suits you.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/calculator"
              className="cta px-7 py-3.5 text-base font-semibold"
            >
              Open CalcU
            </Link>
            <Link
              href="#inside"
              className="cta-ghost px-6 py-3.5 text-base font-medium"
            >
              What&rsquo;s inside
            </Link>
          </div>

          <p className="mt-6 font-mono text-xs tracking-wide text-stone-400">
            Runs entirely in your browser &middot; keyboard-native &middot; no sign-up
          </p>
        </div>

        {/* The product as its own hero image — clickable. */}
        <div className="anim-settle device-halo relative mx-auto w-full max-w-[20rem]">
          <Link href="/calculator" aria-label="Open the CalcU calculator" className="block">
            <DeviceMock expression="355 ÷ 113" value="3.14159" />
          </Link>
        </div>
      </section>

      {/* ---- Features (bento) ---- */}
      <section id="inside" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 pb-8 sm:px-8">
        <div className="mb-10 max-w-xl">
          <h2 className="wordmark text-balance text-[clamp(1.9rem,3.5vw,2.75rem)] font-semibold tracking-[-0.02em] text-stone-50">
            More than four functions.
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-stone-300">
            Under the calm surface is a small workshop of tools — each precise,
            each remembering what you did.
          </p>
        </div>

        <div className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Arithmetic — wide, with a live-looking screen */}
          <article className="tile anim-rise flex flex-col gap-5 p-6 md:col-span-2">
            <div>
              <h3 className="wordmark text-xl font-semibold text-stone-50">
                Arithmetic that flows
              </h3>
              <p className="mt-2 max-w-md text-pretty leading-relaxed text-stone-300">
                Chain operations and watch them fold as you go. Floating-point
                dust is swept up, so the answer reads the way you&rsquo;d write it.
              </p>
            </div>
            <div className="mt-auto grid gap-3 sm:grid-cols-2">
              <div className="screen px-4 py-3">
                <div className="text-right font-mono text-[11px] text-emerald-200/40">2 + 3 + 4</div>
                <div className="screen-value text-right text-2xl font-medium">9</div>
              </div>
              <div className="screen px-4 py-3">
                <div className="text-right font-mono text-[11px] text-emerald-200/40">0.1 + 0.2</div>
                <div className="screen-value text-right text-2xl font-medium">0.3</div>
              </div>
            </div>
          </article>

          {/* Keyboard */}
          <article className="tile anim-rise flex flex-col gap-5 p-6" style={{ animationDelay: "60ms" }}>
            <div>
              <h3 className="wordmark text-xl font-semibold text-stone-50">
                Type, don&rsquo;t tap
              </h3>
              <p className="mt-2 text-pretty leading-relaxed text-stone-300">
                Every key has a keystroke. The one you hit lights up on screen.
              </p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              {["7", "8", "9", "+", "Enter", "⌫", "Esc"].map((k) => (
                <span key={k} className="chip px-3 py-2 text-sm">{k}</span>
              ))}
            </div>
          </article>

          {/* History */}
          <article className="tile anim-rise flex flex-col gap-5 p-6" style={{ animationDelay: "90ms" }}>
            <div>
              <h3 className="wordmark text-xl font-semibold text-stone-50">
                It remembers
              </h3>
              <p className="mt-2 text-pretty leading-relaxed text-stone-300">
                Your last calculations, saved across reloads — sorted into three
                drawers.
              </p>
            </div>
            <div className="mt-auto grid grid-cols-3 gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-stone-400">
              <span className="rounded-lg border border-white/[0.07] py-2 text-center">Calc</span>
              <span className="rounded-lg border border-white/[0.07] py-2 text-center">Quad</span>
              <span className="rounded-lg border border-white/[0.07] py-2 text-center">Func</span>
            </div>
          </article>

          {/* Quadratics */}
          <article className="tile anim-rise flex flex-col gap-5 p-6" style={{ animationDelay: "120ms" }}>
            <div>
              <h3 className="wordmark text-xl font-semibold text-stone-50">
                Quadratics, solved
              </h3>
              <p className="mt-2 text-pretty leading-relaxed text-stone-300">
                Drop in a, b, c. Real roots, repeated roots, complex pairs — all
                handled.
              </p>
            </div>
            <div className="screen mt-auto px-4 py-3 font-mono text-sm text-emerald-200/70">
              <div className="text-emerald-200/40">ax² + bx + c = 0</div>
              <div className="mt-1">x = −2, 3</div>
            </div>
          </article>

          {/* Scientific functions */}
          <article className="tile anim-rise flex flex-col gap-5 p-6" style={{ animationDelay: "150ms" }}>
            <div>
              <h3 className="wordmark text-xl font-semibold text-stone-50">
                Beyond the basics
              </h3>
              <p className="mt-2 text-pretty leading-relaxed text-stone-300">
                Logs, exponents and Euler&rsquo;s number — and they chain into each
                other.
              </p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              {["ln", "log", "xʸ", "e"].map((k) => (
                <span key={k} className="chip px-3 py-2 text-sm text-amber-400">{k}</span>
              ))}
            </div>
          </article>

          {/* AI word problems — full width */}
          <article className="tile anim-rise flex flex-col gap-6 p-6 sm:flex-row sm:items-center lg:col-span-3" style={{ animationDelay: "180ms" }}>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
                <path d="M8 8V5" /><path d="M16 8V5" /><path d="M8 4h0" /><path d="M16 4h0" />
                <rect x="4" y="8" width="16" height="11" rx="2" />
                <path d="M9 13h0" /><path d="M15 13h0" /><path d="M9.5 16q2.5 1.6 5 0" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="wordmark text-xl font-semibold text-stone-50">
                Word problems, worked out
              </h3>
              <p className="mt-2 max-w-xl text-pretty leading-relaxed text-stone-300">
                Describe a problem in plain language and CalcU reasons through it —
                showing the steps, not just the number.
              </p>
            </div>
            <div className="screen w-full px-4 py-3 font-mono text-xs leading-relaxed text-emerald-200/70 sm:max-w-xs">
              <span className="text-emerald-200/40">&ldquo;60 miles in 1.5 hours?&rdquo;</span>
              <br />→ 40 mph
            </div>
          </article>
        </div>
      </section>

      {/* ---- The desktop metaphor ---- */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-md">
            <h2 className="wordmark text-balance text-[clamp(1.9rem,3.5vw,2.75rem)] font-semibold tracking-[-0.02em] text-stone-50">
              Your desk, your layout.
            </h2>
            <p className="mt-5 text-pretty text-lg leading-relaxed text-stone-300">
              On a wide screen, every panel is a free-floating window. Drag the
              calculator, history and solver wherever you think best — the one
              you touch last rises to the top.
            </p>
            <p className="mt-4 text-pretty leading-relaxed text-stone-400">
              On smaller screens it folds neatly into a single, focused column.
            </p>
            <Link
              href="/calculator"
              className="cta mt-8 inline-block px-7 py-3.5 text-base font-semibold"
            >
              Try the desk
            </Link>
          </div>

          {/* Overlapping windows, arranged. */}
          <div className="relative mx-auto h-[22rem] w-full max-w-md sm:h-[24rem]">
            <MiniPanel
              title="Quadratic"
              className="absolute left-0 top-8 w-44 rotate-[-3deg]"
            >
              <div className="screen px-3 py-2 font-mono text-[11px] text-emerald-200/70">
                <div className="text-emerald-200/40">x² − x − 6</div>
                <div>x = −2, 3</div>
              </div>
            </MiniPanel>

            <MiniPanel
              title="History"
              className="absolute right-0 top-0 w-48 rotate-[2deg]"
            >
              <div className="space-y-1.5 font-mono text-[11px] text-emerald-200/60">
                <div className="screen px-3 py-1.5 text-right">12 × 12 = 144</div>
                <div className="screen px-3 py-1.5 text-right">ln(16) = 2.77…</div>
              </div>
            </MiniPanel>

            <MiniPanel
              title="CalcU"
              className="absolute bottom-0 left-6 w-52 rotate-[1deg]"
            >
              <div className="screen mb-2 px-3 py-2">
                <div className="screen-value text-right text-xl font-medium">1,536</div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {["7", "8", "9", "÷", "4", "5", "6", "×"].map((k, i) => (
                  <span
                    key={k}
                    className={`key ${i % 4 === 3 ? "key-op" : "key-digit"} flex h-7 items-center justify-center rounded-lg text-xs`}
                  >
                    {k}
                  </span>
                ))}
              </div>
            </MiniPanel>
          </div>
        </div>
      </section>

      {/* ---- Final CTA ---- */}
      <section className="mx-auto w-full max-w-3xl px-5 pb-24 text-center sm:px-8 lg:pb-32">
        <div className="device-halo relative">
          <h2 className="wordmark text-balance text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.025em] text-stone-50">
            It&rsquo;s already loaded.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-pretty text-lg leading-relaxed text-stone-300">
            No install, no account. Open the calculator and start pressing keys.
          </p>
          <Link
            href="/calculator"
            className="cta mt-9 inline-block px-9 py-4 text-lg font-semibold"
          >
            Open CalcU
          </Link>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="mt-auto border-t border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-stone-400 sm:flex-row sm:px-8">
          <span className="wordmark font-semibold tracking-tight text-stone-200">
            Calc<span className="text-amber-400">U</span>
          </span>
          <span className="font-mono text-xs">Built with Next.js &amp; React 19</span>
          <span className="font-mono text-xs">© 2026</span>
        </div>
      </footer>
    </div>
  );
}
