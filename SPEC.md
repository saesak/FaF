# FaF - Fast as Fuck Speed Reader

## Overview

RSVP (Rapid Serial Visual Presentation) reader with synced document view. Displays one word at a time at a fixed eye position with a highlighted focus letter (ORP - Optimal Reading Point).

---

## UI & Theme

### Colors (User Configurable)
| Element | Default |
|---------|---------|
| Background | `#38393d` |
| Word | `#FFFFFF` |
| Focus letter (ORP) | `#E53935` |

### Font
**Lexend** throughout the entire app (bundled).

### Layout
Two toggleable views:

1. **Reader View**
   - Original document, scrollable
   - Images displayed inline
   - Adjustable font size (+/-)
   - Current word highlighted with subtle background when returning from Speed View

2. **Speed View**
   - Pure background color, nothing else
   - Single word centered
   - No chrome, no controls visible (access on pause)

### Progress Indicator
Visible **only when paused** - shows percentage and estimated time remaining.

---

## Speed Reading Algorithm

### ORP (Optimal Reading Point)
Fixed algorithm based on word length:
```
Length 1-2  → position 0
Length 3-6  → position 1
Length 7-10 → position 2
Length 11-13 → position 3
Length 14+  → position 4
```

### Timing
- Base delay scaled to target WPM
- Punctuation pauses: `.?!` = 3x, `:;,` = 2x
- Length factor: `+0.04 * sqrt(word_length)`

### Speed Control
- Range: 300 - 1200+ WPM
- **Strictly manual** - no auto-adjustment
- Default: **remember last used** WPM

### Word Handling
| Case | Behavior |
|------|----------|
| Long words (30+ chars) | Show full word with extended pause |
| Hyphenated (self-aware) | Treat as single unit |
| Numbers ($1,234, 99%) | Group with surrounding symbols |

---

## View Sync

| Action | Behavior |
|--------|----------|
| Speed → Reader | Jump to current paragraph, highlight word with subtle background |
| Reader → Speed | Resume from last speed-read position |
| Click word in Reader | Set new start point (does NOT auto-play) |
| Any view toggle | **Always auto-pauses** |

---

## Input Formats

### Supported
- **Paste** - auto-detect pasted text
- **Text files** (.txt)
- **EPUB** - chapters flow seamlessly (auto-continue)
- **PDF** - auto-detect column layout, auto-filter repeated headers/footers/page numbers

### Libraries
- `epub.js` for EPUB parsing
- `pdf.js` for PDF parsing

### Limits
- **50 MB max file size** - refuse larger files with inline error message

---

## File Management

### Opening Files
- Drag and drop anywhere
- File picker button

### Empty State
Show **recent files list** with saved positions.

### Persistence
- Store **file path + reading position** (not full content)
- Auto-resume position when reopening a file
- **Single document** at a time (opening new replaces current)

---

## Controls

### Keyboard (Desktop)
| Key | Action |
|-----|--------|
| `Space` | Play/pause |
| `←` / `→` | Skip word backward/forward |
| `[` / `]` | Decrease/increase WPM by 10% |
| `Tab` | Toggle views |

Full keyboard navigation support (tab through all controls, arrow keys in Reader View).

### Mobile Gestures
| Gesture | Action |
|---------|--------|
| Swipe left/right | Toggle between views |
| Tap | Play/pause |
| Long press or pause | Access speed controls |

Speed adjustment requires **pausing first** on mobile.

---

## Desktop App (Tauri)

- Remember window size and position between sessions
- Full keyboard navigation
- No dedicated fullscreen/focus mode (keep simple)

---

## Mobile App (Capacitor)

- Swipe gestures for view switching
- Touch-optimized controls
- Same feature parity as desktop

---

## Error Handling

- **Parse failures** (corrupted PDF, DRM EPUB): Inline message in content area with explanation
- **File too large**: Inline message explaining 50MB limit

---

## About Section

Include this text:

> "The habit that keeps people from speedreading is their habit to pronounce words in their head when they read them. Keep the voice out of your head, and let the eyes do the work."

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Svelte (SvelteKit) |
| Desktop | Tauri |
| Mobile | Capacitor |
| PDF parsing | pdf.js |
| EPUB parsing | epub.js |
| Font | Lexend (bundled) |
| Storage | localStorage |

---

## Out of Scope (MVP)

- User accounts
- Cloud sync
- Onboarding/tutorial
- Multiple documents/tabs
- Focus/fullscreen mode
- Keyboard shortcut to restart document
- ORP position customization
