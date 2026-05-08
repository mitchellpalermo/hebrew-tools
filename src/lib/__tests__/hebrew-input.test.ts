import { describe, it, expect } from 'vitest';
import {
  processKey,
  applyFinalForms,
  lastConsonantIndex,
  isNikud,
  initialState,
  type HebrewInputState,
} from '../hebrew-input';

// Shorthand: process a key on empty input at position 0
function press(key: string, state = initialState, value = '', cursor = 0) {
  return processKey(key, state, value, cursor, cursor);
}

// Simulate typing a sequence of keys from scratch, returns final value
function type(keys: string[]): string {
  let value = '';
  let cursor = 0;
  let state = initialState;
  for (const key of keys) {
    const result = processKey(key, state, value, cursor, cursor);
    if (result.handled) {
      value = result.newValue;
      cursor = result.newCursor;
      state = result.nextState;
    }
  }
  return value;
}

describe('isNikud', () => {
  it('returns true for nikud combining marks', () => {
    expect(isNikud('ַ')).toBe(true);  // patah
    expect(isNikud('ָ')).toBe(true);  // qamets
    expect(isNikud('ְ')).toBe(true);  // sheva
    expect(isNikud('ּ')).toBe(true);  // dagesh
  });

  it('returns false for consonants and non-Hebrew characters', () => {
    expect(isNikud('א')).toBe(false); // alef
    expect(isNikud('a')).toBe(false);
    expect(isNikud(' ')).toBe(false);
  });
});

describe('lastConsonantIndex', () => {
  it('finds the last consonant in plain text', () => {
    expect(lastConsonantIndex('אב')).toBe(1); // alef + bet
  });

  it('skips trailing nikud to find the consonant', () => {
    // alef + patah + qamets: consonant is at index 0
    expect(lastConsonantIndex('אַָ')).toBe(0);
  });

  it('returns -1 for empty string', () => {
    expect(lastConsonantIndex('')).toBe(-1);
  });
});

describe('applyFinalForms', () => {
  it('converts kaf to final kaf', () => {
    // mem + lamed + kaf -> mem + lamed + final-kaf
    expect(applyFinalForms('מלכ')).toBe('מלך');
  });

  it('converts mem to final mem', () => {
    expect(applyFinalForms('שלומ')).toBe('שלום');
  });

  it('converts nun to final nun', () => {
    expect(applyFinalForms('בנ')).toBe('בן');
  });

  it('converts pe to final pe', () => {
    expect(applyFinalForms('אפ')).toBe('אף');
  });

  it('converts tsade to final tsade', () => {
    expect(applyFinalForms('ארצ')).toBe('ארץ');
  });

  it('skips nikud when finding the last consonant', () => {
    // mem + patah: final form should still apply to mem
    expect(applyFinalForms('מַ')).toBe('םַ');
  });

  it('leaves text unchanged when last consonant has no final form', () => {
    expect(applyFinalForms('שלר')).toBe('שלר');
    expect(applyFinalForms('')).toBe('');
  });
});

describe('processKey — consonants', () => {
  const consonantCases: [string, string][] = [
    ["'", 'א'], // alef
    ['b', 'ב'], // bet
    ['g', 'ג'], // gimel
    ['d', 'ד'], // dalet
    ['h', 'ה'], // he
    ['w', 'ו'], // vav
    ['v', 'ו'], // vav alternate
    ['z', 'ז'], // zayin
    ['c', 'ח'], // het
    ['t', 'ט'], // tet
    ['y', 'י'], // yod
    ['k', 'כ'], // kaf
    ['l', 'ל'], // lamed
    ['m', 'מ'], // mem
    ['n', 'נ'], // nun
    ['s', 'ס'], // samek
    ['`', 'ע'], // ayin
    ['p', 'פ'], // pe
    ['x', 'צ'], // tsade
    ['q', 'ק'], // qof
    ['r', 'ר'], // resh
    ['S', 'שׁ'], // shin + shin dot
    ['#', 'שׁ'], // shin alternate
    ['$', 'שׂ'], // sin + sin dot
    ['T', 'ת'], // tav
  ];

  it.each(consonantCases)('key %s produces correct consonant', (key, expected) => {
    const result = press(key);
    expect(result.handled).toBe(true);
    expect(result.newValue).toBe(expected);
    expect(result.nextState).toEqual(initialState);
  });
});

describe('processKey — nikud', () => {
  const nikudCases: [string, string][] = [
    ['a', 'ַ'],         // patah
    ['A', 'ָ'],         // qamets
    ['e', 'ֶ'],         // segol
    ['E', 'ֵ'],         // tsere
    ['i', 'ִ'],         // hireq
    ['o', 'ֹ'],         // holem
    ['u', 'ֻ'],         // qibbuts
    ['O', 'וֹ'],   // holem waw (vav + holem)
    ['U', 'וּ'],   // shureq (vav + dagesh)
  ];

  it.each(nikudCases)('key %s produces correct nikud', (key, expected) => {
    const result = press(key);
    expect(result.handled).toBe(true);
    expect(result.newValue).toBe(expected);
  });
});

describe('processKey — dagesh', () => {
  it('inserts dagesh on "."', () => {
    const result = press('.');
    expect(result.handled).toBe(true);
    expect(result.newValue).toBe('ּ');
  });

  it('inserts dagesh on "*"', () => {
    expect(press('*').newValue).toBe('ּ');
  });
});

describe('processKey — colon / sheva / hateph', () => {
  const colonState: HebrewInputState = { mode: 'colon' };

  it('entering colon transitions to colon state without inserting', () => {
    const result = press(':');
    expect(result.handled).toBe(true);
    expect(result.newValue).toBe('');
    expect(result.nextState).toEqual({ mode: 'colon' });
  });

  it(':a produces hateph patah', () => {
    const result = processKey('a', colonState, '', 0, 0);
    expect(result.newValue).toBe('ֲ'); // hateph patah
    expect(result.nextState).toEqual(initialState);
  });

  it(':e produces hateph segol', () => {
    const result = processKey('e', colonState, '', 0, 0);
    expect(result.newValue).toBe('ֱ'); // hateph segol
  });

  it(':A produces hateph qamets', () => {
    const result = processKey('A', colonState, '', 0, 0);
    expect(result.newValue).toBe('ֳ'); // hateph qamets
  });

  it(':b produces sheva + bet', () => {
    const result = processKey('b', colonState, '', 0, 0);
    expect(result.newValue).toBe('ְב'); // sheva + bet
    expect(result.nextState).toEqual(initialState);
  });

  it('colon state + space inserts sheva before space', () => {
    const result = processKey(' ', colonState, 'נ', 1, 1);
    expect(result.newValue).toContain('ְ'); // sheva present
  });

  it('full sequence ":a" types hateph patah', () => {
    expect(type([':', 'a'])).toBe('ֲ');
  });

  it('full sequence ":" + consonant types sheva then consonant', () => {
    expect(type([':', 'b'])).toBe('ְב'); // sheva + bet
  });
});

describe('processKey — space and final forms', () => {
  it('converts kaf to final kaf before space', () => {
    const result = processKey(' ', initialState, 'מלכ', 3, 3);
    expect(result.newValue).toBe('מלך ');
  });

  it('converts mem to final mem before space', () => {
    const result = processKey(' ', initialState, 'שלומ', 4, 4);
    expect(result.newValue).toBe('שלום ');
  });

  it('converts nun to final nun before space', () => {
    const result = processKey(' ', initialState, 'בנ', 2, 2);
    expect(result.newValue).toBe('בן ');
  });

  it('converts pe to final pe before space', () => {
    const result = processKey(' ', initialState, 'יפ', 2, 2);
    expect(result.newValue).toBe('יף ');
  });

  it('converts tsade to final tsade before space', () => {
    const result = processKey(' ', initialState, 'ארצ', 3, 3);
    expect(result.newValue).toBe('ארץ ');
  });

  it('leaves non-final consonants unchanged before space', () => {
    const result = processKey(' ', initialState, 'בר', 2, 2);
    expect(result.newValue).toBe('בר ');
  });

  it('inserts newline on Enter and applies final forms', () => {
    const result = processKey('Enter', initialState, 'כ', 1, 1);
    expect(result.newValue).toBe('ך\n'); // final kaf + newline
  });
});

describe('processKey — cursor and selection', () => {
  it('inserts at cursor position in the middle of text', () => {
    // cursor between alef (U+05D0) and tav (U+05EA)
    const result = processKey('b', initialState, 'את', 1, 1);
    expect(result.newValue).toBe('אבת');
    expect(result.newCursor).toBe(2);
  });

  it('replaces selected text', () => {
    const result = processKey('b', initialState, 'שלום', 0, 4);
    expect(result.newValue).toBe('ב');
    expect(result.newCursor).toBe(1);
  });
});

describe('processKey — unhandled keys', () => {
  it('returns handled: false for unrecognized keys', () => {
    const result = press('F1');
    expect(result.handled).toBe(false);
    expect(result.newValue).toBe('');
  });

  it('returns handled: false for digit keys', () => {
    expect(press('1').handled).toBe(false);
    expect(press('5').handled).toBe(false);
  });
});

describe('type() — word-level integration', () => {
  it('types a word with final kaf via space', () => {
    // m=mem, E=tsere, l=lamed, e=segol, k=kaf, space triggers final kaf
    const result = type(['m', 'E', 'l', 'e', 'k', ' ']);
    // mem + tsere + lamed + segol + final-kaf + space
    expect(result).toBe('מֵלֶך ');
  });

  it('types bet with dagesh then sheva then resh', () => {
    // b=bet, .=dagesh, :=colon-state, r=sheva+resh
    const result = type(['b', '.', ':', 'r']);
    // bet + dagesh + sheva + resh
    expect(result).toBe('בְּר');
  });

  it('types holem waw correctly with capital O', () => {
    const result = type(['l', 'O']);
    // lamed + vav + holem
    expect(result).toBe('לוֹ');
  });
});
