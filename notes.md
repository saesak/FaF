# Review Notes: Batches 1 & 2

## Batch 1 Review (Foundation)

### Verdict: PASS with 1 fix needed

**Files Reviewed:**
- src/lib/persistence/types.ts ✓
- src/lib/persistence/adapters/* ✓
- src/lib/persistence/fileId.ts ✓
- src/lib/persistence/migrations.ts ✓
- src/lib/persistence/init.ts ✓
- src/lib/persistence/appClose.ts ✓
- src/lib/persistence/index.ts ✓

**TypeScript Check:** No errors

**Issues:**
1. CRITICAL - position.ts:50 - `savePosition` missing `totalWords` parameter

**Warnings:**
- Capacitor adapter has repeated dynamic imports (performance, not blocking)
- Lazy adapter initialization differs slightly from spec (but actually better for SSR)

---

## Batch 2 Review (Core Stores)

### Verdict: PASS with 1 fix needed

**Files Reviewed:**
- src/lib/stores/settings.ts ✓
- src/lib/stores/document.ts ✓
- src/lib/stores/position.ts ✓ (1 issue)
- src/lib/stores/recentFiles.ts ✓
- src/lib/stores/windowState.ts ✓
- src/lib/stores/index.ts ✓

**TypeScript Check:** No errors

**Checklist:**
- [x] settingsStore: init, setWpm, adjustWpm, setColors, setFontSize, reset
- [x] positionStore: init, loadPosition, setPosition, savePosition, restorePosition, clearPosition, skip, jumpTo, advance
- [x] positionStore exports currentWord derived store
- [x] recentFilesStore: init, addFile, updatePosition, removeFile, clear, getFile
- [x] windowStateStore: init, saveState, cleanup
- [x] Stores use getStorageAdapter() and STORAGE_KEYS correctly
- [x] Barrel exports correct

**Issues:**
1. CRITICAL - position.ts:50 - `savePosition(fileId)` should be `savePosition(fileId, totalWords)`

---

## Fix Required

**File:** `/home/matt/FaF/src/lib/stores/position.ts`
**Line:** 50
**Change:** Add `totalWords: number` parameter to match spec signature

```typescript
// FROM:
async savePosition(fileId: string) {

// TO:
async savePosition(fileId: string, _totalWords: number) {
```

---

## Final Status

**BOTH BATCHES APPROVED** ✅

### Fixes Applied:
1. `src/lib/stores/position.ts:50` - Added `_totalWords` parameter
2. `src/lib/playback/engine.ts:125` - Updated caller to pass `s.totalWords`
3. `src/lib/playback/engine.ts:185` - Updated caller to pass `s.totalWords`

### TypeScript Check: PASS
```
npx tsc --noEmit → No errors
```

### IMPLEMENTATION_PROMPT.md Updated:
- Batch 1: Foundation ✅
- Batch 2: Core Stores ✅
