// Hebrew keyboard input processing — SBL-style phonetic mapping.
// Pure functions; no DOM dependency so they're fully unit-testable.

export type InputMode = 'normal' | 'colon';

export interface HebrewInputState {
  mode: InputMode;
}

export const initialState: HebrewInputState = { mode: 'normal' };

export interface KeyProcessResult {
  handled: boolean;
  newValue: string;
  newCursor: number;
  nextState: HebrewInputState;
}

// ── Unicode constants ────────────────────────────────────────────────────────

const DAGESH = 'ּ'; // ּ dagesh / mappiq

// Consonant map: key → Hebrew letter(s)
const CONSONANTS: Record<string, string> = {
  "'": 'א', // א alef
  'b': 'ב', // ב bet
  'g': 'ג', // ג gimel
  'd': 'ד', // ד dalet
  'h': 'ה', // ה he
  'w': 'ו', // ו vav
  'v': 'ו', // ו vav (alternate)
  'z': 'ז', // ז zayin
  'c': 'ח', // ח het
  't': 'ט', // ט tet
  'y': 'י', // י yod
  'k': 'כ', // כ kaf
  'l': 'ל', // ל lamed
  'm': 'מ', // מ mem
  'n': 'נ', // נ nun
  's': 'ס', // ס samek
  '`': 'ע', // ע ayin
  'p': 'פ', // פ pe
  'x': 'צ', // צ tsade
  'q': 'ק', // ק qof
  'r': 'ר', // ר resh
  'S': 'שׁ', // שׁ shin (with shin dot)
  '#': 'שׁ', // שׁ shin (alternate)
  '$': 'שׂ', // שׂ sin (with sin dot)
  'T': 'ת', // ת tav
};

// Simple nikud (single combining character inserted after cursor)
const NIKUD: Record<string, string> = {
  'a': 'ַ', // ַ patah
  'A': 'ָ', // ָ qamets
  'e': 'ֶ', // ֶ segol
  'E': 'ֵ', // ֵ tsere
  'i': 'ִ', // ִ hireq
  'o': 'ֹ', // ֹ holem
  'u': 'ֻ', // ֻ qibbuts
};

// Hateph vowels (follow a colon)
const HATEPH: Record<string, string> = {
  'a': 'ֲ', // ֲ hateph patah
  'e': 'ֱ', // ֱ hateph segol
  'A': 'ֳ', // ֳ hateph qamets
};

// Final form substitutions applied when a word boundary (space/Enter) is typed
const FINAL_FORMS: Record<string, string> = {
  'כ': 'ך', // כ → ך
  'מ': 'ם', // מ → ם
  'נ': 'ן', // נ → ן
  'פ': 'ף', // פ → ף
  'צ': 'ץ', // צ → ץ
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true for nikud / cantillation combining marks (U+05B0–U+05C7). */
export function isNikud(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return cp >= 0x05B0 && cp <= 0x05C7;
}

/**
 * Scan backwards through `text` skipping combining marks to find the index of
 * the last base consonant. Returns -1 if none found.
 */
export function lastConsonantIndex(text: string): number {
  for (let i = text.length - 1; i >= 0; i--) {
    if (!isNikud(text[i])) return i;
  }
  return -1;
}

/**
 * Apply final-form substitution to the last consonant in `text` if applicable.
 * Returns the (possibly modified) string.
 */
export function applyFinalForms(text: string): string {
  const idx = lastConsonantIndex(text);
  if (idx < 0) return text;
  const ch = text[idx];
  if (ch in FINAL_FORMS) {
    return text.slice(0, idx) + FINAL_FORMS[ch] + text.slice(idx + 1);
  }
  return text;
}

// ── Core function ────────────────────────────────────────────────────────────

/**
 * Process a single keydown `key` value against the current input state.
 *
 * @param key            `event.key` string from the keydown event
 * @param state          current HebrewInputState (tracks multi-char sequences)
 * @param value          current textarea value
 * @param selectionStart cursor / selection start position
 * @param selectionEnd   cursor / selection end position (same as start if no selection)
 */
export function processKey(
  key: string,
  state: HebrewInputState,
  value: string,
  selectionStart: number,
  selectionEnd: number = selectionStart,
): KeyProcessResult {
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);

  function insert(chars: string, nextState: HebrewInputState = initialState): KeyProcessResult {
    const newValue = before + chars + after;
    return { handled: true, newValue, newCursor: before.length + chars.length, nextState };
  }

  // ── Colon state: waiting for hateph vowel qualifier ──────────────────────
  if (state.mode === 'colon') {
    if (key in HATEPH) {
      return insert(HATEPH[key]);
    }
    // Not a hateph — emit sheva, then process this key in normal mode
    const shevaResult = processKey(key, initialState, before + 'ְ' + after, before.length + 1, before.length + 1);
    if (shevaResult.handled) return shevaResult;
    // Key wasn't handled in normal mode either — just emit sheva
    return {
      handled: true,
      newValue: before + 'ְ' + after,
      newCursor: before.length + 1,
      nextState: initialState,
    };
  }

  // ── Normal state ─────────────────────────────────────────────────────────

  // Consonants
  if (key in CONSONANTS) return insert(CONSONANTS[key]);

  // Simple nikud
  if (key in NIKUD) return insert(NIKUD[key]);

  // Holem waw (vav + holem) — capital O
  if (key === 'O') return insert('וֹ');

  // Shureq (vav + dagesh) — capital U
  if (key === 'U') return insert('וּ');

  // Dagesh / mappiq
  if (key === '.' || key === '*') return insert(DAGESH);

  // Colon → enter colon state (pending sheva or hateph)
  if (key === ':') {
    return { handled: true, newValue: value, newCursor: selectionStart, nextState: { mode: 'colon' } };
  }

  // Space / Enter → apply final forms before inserting
  if (key === ' ' || key === 'Enter') {
    const converted = applyFinalForms(before);
    const ch = key === 'Enter' ? '\n' : ' ';
    return {
      handled: true,
      newValue: converted + ch + after,
      newCursor: converted.length + 1,
      nextState: initialState,
    };
  }

  return { handled: false, newValue: value, newCursor: selectionStart, nextState: initialState };
}
