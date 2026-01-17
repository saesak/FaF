# FaF Implementation - Agentic Framework

You are implementing the FaF (Fast as Fuck) RSVP speed reader application using a **Planner → Implementer → Judge** loop.

## Source of Truth

All specifications live in `/home/matt/FaF/architecture/specs/`:
- `parser_spec.md` - File parsing, tokenization, ORP calculation
- `playback_spec.md` - Timing engine, word ticker, state machine
- `view_spec.md` - SpeedView, ReaderView, view sync
- `input_spec.md` - Keyboard, touch, file input handling
- `persistence_spec.md` - Storage adapters, Svelte stores
- `ui_spec.md` - Theme, colors, Lexend font, CSS

Also reference:
- `/home/matt/FaF/architecture/SYSTEM_STATE_MACHINE.md` - Master architecture
- `/home/matt/FaF/SPEC.md` - Original requirements

## Implementation Rules

### 1. Specs Are Source of Truth
- Before implementing any module, READ the relevant spec
- If implementation reveals spec issues, UPDATE the spec first
- Cross-boundary interactions MUST match spec interfaces exactly
- Add "## Implementation Notes" section to specs with file paths and deviations

### 2. Clean API Boundaries
- Exported interfaces MUST match spec TypeScript definitions exactly
- Internal implementation details can vary, public APIs cannot
- Use barrel exports (`index.ts`) for each module
- Document any spec updates in git commits

### 3. Agent Workflow Per Module

```
[PLANNER]
  - Read relevant spec(s)
  - Identify files to create/modify
  - Check cross-spec dependencies
  - Output: file list + implementation order

[IMPLEMENTER]
  - Create files following spec exactly
  - Run type checking after each file
  - If spec is ambiguous/wrong, STOP and update spec first
  - Output: working code + any spec updates

[JUDGE]
  - Verify implementation matches spec interfaces
  - Run tests if available
  - Check for OWASP vulnerabilities
  - Output: PASS or list of issues
```

### 4. Implementation Batches

Execute in order (respects dependency graph):

**Batch 1: Foundation** ✅
- [x] Project setup (SvelteKit + Tauri + Capacitor scaffolding)
- [x] `src/lib/persistence/types.ts` - All shared interfaces
- [x] `src/lib/persistence/adapters/` - Storage adapters

**Batch 2: Core Stores** ✅
- [x] `src/lib/stores/settings.ts`
- [x] `src/lib/stores/document.ts`
- [x] `src/lib/stores/position.ts`
- [x] `src/lib/stores/recentFiles.ts`

**Batch 3: Parser System** ✅
- [x] `src/lib/parser/` - All parsers (txt, epub, pdf)
- [x] `src/lib/parser/tokenizer.ts` - Word tokenization + ORP

**Batch 4: Playback Engine** ✅
- [x] `src/lib/playback/timing.ts` - Timing calculator
- [x] `src/lib/playback/ticker.ts` - Word ticker
- [x] `src/lib/playback/engine.ts` - State machine

**Batch 5: Input System** ✅
- [x] `src/lib/input/keyboard.ts`
- [x] `src/lib/input/touch.ts`
- [x] `src/lib/input/file.ts`

**Batch 6: Views** ✅
- [x] `src/lib/components/SpeedView.svelte`
- [x] `src/lib/components/ReaderView.svelte`
- [x] `src/lib/components/ViewSync.ts`

**Batch 7: UI Shell** ✅
- [x] `src/lib/theme/` - CSS custom properties, theme store
- [x] `src/routes/+layout.svelte` - App shell
- [x] `src/routes/+page.svelte` - Main page

**Batch 8: Platform Integration** ✅
- [x] Tauri configuration + window state
- [x] Capacitor configuration
- [x] Platform-specific builds

### 5. Cross-Boundary Protocol

When implementing module A that depends on module B:
1. Read BOTH specs (A and B)
2. Import B's interface from its barrel export
3. If B isn't implemented yet, create a mock matching spec interface
4. Never modify B's public interface without updating B's spec first

### 6. Spec Update Format

When updating a spec during implementation:
```markdown
## Implementation Notes

### File Mapping
| Spec Section | File Path |
|--------------|-----------|
| Section 3.1 | `src/lib/parser/txt.ts` |

### Deviations
- [Section X]: Changed Y because Z (implementation detail, interface unchanged)

### Discovered Issues
- [Section Y]: Spec said A but B is correct because C (spec updated)
```

## Commands

Start implementation:
```
Implement Batch 1 following the agentic framework. For each module:
1. PLANNER: Read specs, plan files
2. IMPLEMENTER: Write code matching spec interfaces
3. JUDGE: Verify correctness

Update specs with Implementation Notes as you go. Use TodoWrite to track progress.
```

Continue implementation:
```
Continue to Batch N. Read relevant specs first. Maintain clean API boundaries.
```

Fix issues:
```
Judge found issues in [module]. Return to implementer to fix. Update spec if needed.
```

## Quality Gates

Before marking a batch complete:
- [ ] All TypeScript compiles with no errors
- [ ] Public interfaces match spec exactly
- [ ] Spec updated with Implementation Notes
- [ ] No console errors in browser
- [ ] Cross-boundary imports work correctly
