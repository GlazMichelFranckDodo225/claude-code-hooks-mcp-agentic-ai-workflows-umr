# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Future Me** is a single-page "letters to your future self" app. A user writes a letter with a reveal date; the letter is sealed and stored locally, showing a live countdown and progress bar until the reveal date passes, after which it can be opened and read.

It is a **zero-dependency, vanilla HTML/CSS/JS static site** — no build step, no package manager, no tests, no framework. The whole app is three files: `index.html`, `style.css`, `script.js`.

## Running

Open `index.html` directly in a browser, or serve the folder statically (e.g. `python -m http.server`). There is nothing to build, install, or compile. Changes to the three files take effect on browser reload.

> Note: this directory sits inside a larger course repo (`../faker-next`, `../color-explorer` are unrelated sibling projects with their own tooling). The git repository root is the parent directory. Keep work scoped to `future-me/`.

## Architecture

All application logic lives in `script.js` as module-level functions wired up at load time by the IIFE `init()` at the bottom. There is no app object or class — state lives in `localStorage` and is re-read on each render.

- **Persistence**: Letters are stored in `localStorage` under `futureme_letters` (JSON array); theme under `futureme_theme`. `loadLetters()` / `saveLetters()` are the only storage accessors — go through them rather than touching `localStorage` directly. Newest letters are `unshift`ed to the front.
- **Letter shape**: `{ id (crypto.randomUUID), authorName, title, message, revealDate (date string), createdAt (ISO string) }`.
- **Lock logic**: `isUnlocked()` compares `Date.now()` to `revealDate`. A letter is "sealed" (read disabled) until its reveal date passes. `progressPercent()` derives the bar from `createdAt`→`revealDate` elapsed time.
- **Rendering**: `renderDashboard()` clears and rebuilds the entire `#lettersGrid` from `localStorage`; `buildLetterCard()` produces each card's markup. Call `renderDashboard()` after any mutation (create/delete) to refresh the UI and the header counts.
- **Live ticker**: `startCountdownTicker()` runs a 1s `setInterval` that updates each card's countdown text and progress fill in place, and triggers a full `renderDashboard()` the moment a locked letter crosses its reveal time (so the Read button enables itself without a page reload).
- **Card events** use delegation: a single click listener on `#lettersGrid` reads `data-action`/`data-id` attributes. Add new card buttons via these data attributes rather than per-card listeners.
- **Theming**: light/dark is driven entirely by the `data-theme` attribute on `<html>`, which swaps the CSS custom properties (design tokens) defined at the top of `style.css`. `applyTheme()` is the single source of truth; it persists the choice and updates the toggle icon.

## Conventions

- `$(id)` is the shorthand for `document.getElementById`; DOM refs are cached as module-level consts near the top of `script.js`.
- **Any user-provided string injected into a card via `innerHTML` must pass through `escHtml()`** (XSS guard). Modal content is set via `textContent` instead and needs no escaping.
- Reveal date is validated to be strictly in the future on submit; `setMinDate()` also sets the input's `min` to tomorrow.
