# FaF System Architecture - State Machine

## Master State Machine

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   APPLICATION                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  EMPTY_STATE                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  • Show recent files list                                                │    │
│  │  • File picker button visible                                            │    │
│  │  • Drag-drop zone active                                                 │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
          │                                          │
          │ [file_drop]                              │ [file_pick]
          │ [paste_text]                             │ [recent_file_click]
          ▼                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 LOADING_STATE                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  Input: File blob / pasted text / file path                             │    │
│  │                                                                          │    │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │    │
│  │  │  TXT_PARSER  │    │ EPUB_PARSER  │    │  PDF_PARSER  │               │    │
│  │  │              │    │  (epub.js)   │    │  (pdf.js)    │               │    │
│  │  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘               │    │
│  │         │                   │                   │                        │    │
│  │         └───────────────────┼───────────────────┘                        │    │
│  │                             ▼                                            │    │
│  │                    ┌─────────────────┐                                   │    │
│  │                    │  WORD_TOKENIZER │                                   │    │
│  │                    │  • Split words  │                                   │    │
│  │                    │  • Calc ORP     │                                   │    │
│  │                    │  • Map positions│                                   │    │
│  │                    └────────┬────────┘                                   │    │
│  │                             ▼                                            │    │
│  │                    ┌─────────────────┐                                   │    │
│  │                    │ DOCUMENT_MODEL  │                                   │    │
│  │                    │ {words[], meta} │                                   │    │
│  │                    └─────────────────┘                                   │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
          │                                          │
          │ [parse_success]                          │ [parse_error]
          ▼                                          ▼
┌──────────────────────────────────┐    ┌─────────────────────────────────────────┐
│        DOCUMENT_LOADED           │    │              ERROR_STATE                 │
│  ┌────────────────────────────┐  │    │  • Display inline error message         │
│  │ DocumentStore initialized  │  │    │  • "Corrupted PDF" / "DRM EPUB" / etc   │
│  │ Position restored (if any) │  │    │  • Return to EMPTY on dismiss           │
│  └────────────────────────────┘  │    └─────────────────────────────────────────┘
└──────────────────────────────────┘
          │
          │ [auto_transition]
          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              VIEW_STATE (exclusive)                              │
│                                                                                  │
│   ┌─────────────────────────────────┐   ┌─────────────────────────────────┐     │
│   │         READER_VIEW             │   │          SPEED_VIEW              │     │
│   │  ┌───────────────────────────┐  │   │  ┌───────────────────────────┐  │     │
│   │  │ • Full document scroll    │  │   │  │ • Single word centered    │  │     │
│   │  │ • Images inline           │  │   │  │ • ORP letter highlighted  │  │     │
│   │  │ • Font size +/-           │  │   │  │ • Pure background         │  │     │
│   │  │ • Word highlight (sync)   │  │   │  │ • No chrome               │  │     │
│   │  │ • Click word → set pos    │  │   │  └───────────────────────────┘  │     │
│   │  └───────────────────────────┘  │   │                                  │     │
│   │                                  │◄─┼──────────[Tab / Swipe]───────────┤     │
│   │                                  ├──┼──────────[Tab / Swipe]──────────►│     │
│   └─────────────────────────────────┘   └─────────────────────────────────┘     │
│                                                       │                          │
│                                                       ▼                          │
│                                         ┌─────────────────────────────┐          │
│                                         │   PLAYBACK_STATE (nested)   │          │
│                                         │                             │          │
│                                         │  ┌────────┐    ┌────────┐  │          │
│                                         │  │ PAUSED │◄──►│PLAYING │  │          │
│                                         │  └────────┘    └────────┘  │          │
│                                         │       │[Space/Tap]  │      │          │
│                                         │       └──────┬──────┘      │          │
│                                         │              │             │          │
│                                         │  PAUSED shows:             │          │
│                                         │  • Progress %              │          │
│                                         │  • Time remaining          │          │
│                                         │  • Speed controls          │          │
│                                         └─────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────────┘


## Timing Engine (runs in PLAYING state)

┌─────────────────────────────────────────────────────────────────────────────────┐
│                               TIMING_ENGINE                                      │
│                                                                                  │
│   ┌─────────────┐     ┌─────────────────────────────────────┐                   │
│   │  WPM_STORE  │────►│          DELAY_CALCULATOR           │                   │
│   │  (300-1200) │     │                                     │                   │
│   └─────────────┘     │  base_delay = 60000 / WPM           │                   │
│                       │                                     │                   │
│   ┌─────────────┐     │  punctuation_multiplier:            │                   │
│   │ CURRENT_WORD│────►│    .?! → 3x                         │                   │
│   │             │     │    :;, → 2x                         │                   │
│   └─────────────┘     │                                     │                   │
│                       │  length_factor:                     │                   │
│                       │    +0.04 * sqrt(word_length)        │                   │
│                       │                                     │                   │
│                       └──────────────────┬──────────────────┘                   │
│                                          │                                       │
│                                          ▼                                       │
│                       ┌─────────────────────────────────────┐                   │
│                       │           WORD_TICKER               │                   │
│                       │  setTimeout(nextWord, delay)        │                   │
│                       │  → increment position               │                   │
│                       │  → emit word_changed event          │                   │
│                       └─────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────────┘


## Data Flow

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  STORES (Svelte)                                 │
│                                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │ documentStore  │  │ positionStore  │  │ settingsStore  │  │ recentStore  │  │
│  │                │  │                │  │                │  │              │  │
│  │ • words[]      │  │ • currentIdx   │  │ • wpm          │  │ • files[]    │  │
│  │ • metadata     │  │ • paragraphIdx │  │ • colors       │  │ • positions  │  │
│  │ • filePath     │  │                │  │ • fontSize     │  │              │  │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘  └──────┬───────┘  │
│          │                   │                   │                   │          │
│          └───────────────────┴───────────────────┴───────────────────┘          │
│                                          │                                       │
│                                          ▼                                       │
│                              ┌───────────────────────┐                          │
│                              │    localStorage       │                          │
│                              │    (persistence)      │                          │
│                              └───────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────────┘


## Component Breakdown (for spec files)

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SPEC COMPONENTS                                     │
│                                                                                  │
│  1. PARSER_SYSTEM          ──► parser_spec.md                                   │
│     • TXT/EPUB/PDF parsing                                                       │
│     • Word tokenization                                                          │
│     • ORP calculation                                                            │
│     • Position mapping                                                           │
│                                                                                  │
│  2. PLAYBACK_ENGINE        ──► playback_spec.md                                 │
│     • Timing calculations                                                        │
│     • Word ticker                                                                │
│     • Play/pause state                                                           │
│     • Speed controls                                                             │
│                                                                                  │
│  3. VIEW_SYSTEM            ──► view_spec.md                                     │
│     • Reader view component                                                      │
│     • Speed view component                                                       │
│     • View synchronization                                                       │
│     • Progress indicator                                                         │
│                                                                                  │
│  4. INPUT_SYSTEM           ──► input_spec.md                                    │
│     • Keyboard controls                                                          │
│     • Touch gestures                                                             │
│     • Drag-drop handling                                                         │
│     • File picker                                                                │
│                                                                                  │
│  5. PERSISTENCE_SYSTEM     ──► persistence_spec.md                              │
│     • Settings storage                                                           │
│     • Recent files                                                               │
│     • Position tracking                                                          │
│     • Platform adapters (Tauri/Capacitor)                                        │
│                                                                                  │
│  6. UI_THEME               ──► ui_spec.md                                       │
│     • Color system                                                               │
│     • Typography (Lexend)                                                        │
│     • Layout                                                                     │
│     • Responsive design                                                          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Agent Workflow

For each component spec file, run the **Planner → Implementer → Judge** loop:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PLANNER-IMPLEMENTER-JUDGE LOOP                         │
│                                                                                  │
│                              ┌─────────────┐                                    │
│                              │   PLANNER   │                                    │
│                              │             │                                    │
│                              │ • Analyze   │                                    │
│                              │ • Structure │                                    │
│                              │ • Outline   │                                    │
│                              └──────┬──────┘                                    │
│                                     │                                            │
│                                     ▼                                            │
│   ┌──────────────┐          ┌─────────────┐          ┌──────────────┐           │
│   │    JUDGE     │◄─────────│ IMPLEMENTER │          │  {component} │           │
│   │              │          │             │─────────►│   _spec.md   │           │
│   │ • Critique   │          │ • Write     │          │              │           │
│   │ • Verify     │          │ • Detail    │          │ + progress   │           │
│   │ • Score      │          │ • Examples  │          │ + status     │           │
│   └──────┬───────┘          └─────────────┘          └──────────────┘           │
│          │                         ▲                                             │
│          │ [needs_revision]        │                                             │
│          └─────────────────────────┘                                             │
│                                                                                  │
│          │ [approved]                                                            │
│          ▼                                                                       │
│   ┌──────────────┐                                                              │
│   │    DONE      │                                                              │
│   │  Move to     │                                                              │
│   │  next spec   │                                                              │
│   └──────────────┘                                                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## File Structure

```
/home/matt/FaF/
├── SPEC.md                          # Original high-level spec
├── architecture/
│   ├── SYSTEM_STATE_MACHINE.md      # This file
│   ├── PROGRESS.md                  # Overall progress tracker
│   │
│   └── specs/
│       ├── parser_spec.md           # Component 1
│       ├── playback_spec.md         # Component 2
│       ├── view_spec.md             # Component 3
│       ├── input_spec.md            # Component 4
│       ├── persistence_spec.md      # Component 5
│       └── ui_spec.md               # Component 6
```

Each spec file includes a header for agent context persistence:

```markdown
# {Component} Specification

## Agent Context
- **Status**: [planning|drafting|reviewing|approved]
- **Iteration**: N
- **Last Agent**: [planner|implementer|judge]
- **Last Action**: {description}
- **Open Issues**: {list}

## Content
...
```
