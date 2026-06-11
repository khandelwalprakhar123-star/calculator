# Tactile — a calculator that feels like a desktop

A small but feature-rich calculator web app built with Next.js. Beyond the usual four-function arithmetic, it adds a persistent calculation history, a quadratic-equation solver, full keyboard support, and a playful desktop metaphor where every panel is a free-floating, draggable window.

## Features

- **Four-function arithmetic** — addition, subtraction, multiplication, division, with operator chaining (e.g. `2 + 3 + 4` folds as you go) and clean handling of floating-point dust.
- **Keyboard support** — type digits, `+ - * /`, `Enter`/`=`, `Backspace`, and `Esc` to clear; the on-screen key you hit flashes for feedback.
- **Calculation history** — the last 10 completed calculations, newest first, persisted across reloads via `localStorage`.
- **Quadratic solver** — enter `a`, `b`, `c` and solve `ax² + bx + c = 0`. Handles all three discriminant cases (two real roots, one repeated root, complex conjugates) and guards the degenerate `a = 0` case. Keeps its own separate history.
- **Draggable floating windows** — on desktop (≥1024px) the calculator, history, and solver are independent windows you can drag anywhere and stack; the last one you touch rises to the top.
- **Responsive** — below desktop width the windows collapse into centered modal sheets with a tap-to-dismiss backdrop.
- **Error handling** — division by zero shows `Error` rather than `Infinity`.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)

The app is fully client-side — the page is statically prerendered and all state (calculator logic, history, drag positions) lives in the browser.

## Getting started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the calculator.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create an optimized production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## How it works

The calculator's core is a pure reducer — `reduce(state, key)` takes the current state plus a key and returns the next state, never touching anything outside its arguments. That purity is what makes both the click handlers and the keyboard wiring trivial to reason about. A thin `step()` layer wraps it to append completed calculations to the history. Window dragging is handled by a small `useDraggable` hook that tracks an offset from screen-center and a z-index, listening on `window` so a drag keeps tracking even if the pointer outruns the panel.
