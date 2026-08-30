import { useRef, useState, useCallback } from 'react';
import { processKey, initialState, type HebrewInputState } from '../lib/hebrew-input';

// ── Reference chart data ─────────────────────────────────────────────────────

const CONSONANT_ROWS = [
  { key: "'", hebrew: 'א', name: 'Alef' },
  { key: 'b', hebrew: 'ב', name: 'Bet' },
  { key: 'g', hebrew: 'ג', name: 'Gimel' },
  { key: 'd', hebrew: 'ד', name: 'Dalet' },
  { key: 'h', hebrew: 'ה', name: 'He' },
  { key: 'w / v', hebrew: 'ו', name: 'Vav' },
  { key: 'z', hebrew: 'ז', name: 'Zayin' },
  { key: 'c', hebrew: 'ח', name: 'Het' },
  { key: 't', hebrew: 'ט', name: 'Tet' },
  { key: 'y', hebrew: 'י', name: 'Yod' },
  { key: 'k', hebrew: 'כ / ך', name: 'Kaf' },
  { key: 'l', hebrew: 'ל', name: 'Lamed' },
  { key: 'm', hebrew: 'מ / ם', name: 'Mem' },
  { key: 'n', hebrew: 'נ / ן', name: 'Nun' },
  { key: 's', hebrew: 'ס', name: 'Samek' },
  { key: '`', hebrew: 'ע', name: 'Ayin' },
  { key: 'p', hebrew: 'פ / ף', name: 'Pe' },
  { key: 'x', hebrew: 'צ / ץ', name: 'Tsade' },
  { key: 'q', hebrew: 'ק', name: 'Qof' },
  { key: 'r', hebrew: 'ר', name: 'Resh' },
  { key: 'S or #', hebrew: 'שׁ', name: 'Shin' },
  { key: '$', hebrew: 'שׂ', name: 'Sin' },
  { key: 'T', hebrew: 'ת', name: 'Tav' },
];

const NIKUD_ROWS = [
  { key: 'a', hebrew: 'ַ', name: 'Patah' },
  { key: 'A', hebrew: 'ָ', name: 'Qamets' },
  { key: 'e', hebrew: 'ֶ', name: 'Segol' },
  { key: 'E', hebrew: 'ֵ', name: 'Tsere' },
  { key: 'i', hebrew: 'ִ', name: 'Hireq' },
  { key: 'o', hebrew: 'ֹ', name: 'Holem' },
  { key: 'O', hebrew: 'וֹ', name: 'Holem Waw' },
  { key: 'u', hebrew: 'ֻ', name: 'Qibbuts' },
  { key: 'U', hebrew: 'וּ', name: 'Shureq' },
  { key: ':', hebrew: 'ְ', name: 'Sheva' },
  { key: ':a', hebrew: 'ֲ', name: 'Hateph Patah' },
  { key: ':e', hebrew: 'ֱ', name: 'Hateph Segol' },
  { key: ':A', hebrew: 'ֳ', name: 'Hateph Qamets' },
  { key: '. or *', hebrew: 'ּ', name: 'Dagesh' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function HebrewKeyboard() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputStateRef = useRef<HebrewInputState>(initialState);
  const [copied, setCopied] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  // Tracks whether we're in colon state so UI can show a pending indicator
  const [pendingColon, setPendingColon] = useState(false);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;

    // Pass through browser/OS shortcuts and navigation keys
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab',
         'Backspace', 'Delete', 'Escape'].includes(e.key)) {
      // Reset colon state on Escape or Backspace
      if (e.key === 'Escape' || e.key === 'Backspace') {
        inputStateRef.current = initialState;
        setPendingColon(false);
      }
      return;
    }

    const result = processKey(
      e.key,
      inputStateRef.current,
      textarea.value,
      textarea.selectionStart ?? 0,
      textarea.selectionEnd ?? 0,
    );

    if (result.handled) {
      e.preventDefault();
      textarea.value = result.newValue;
      textarea.selectionStart = result.newCursor;
      textarea.selectionEnd = result.newCursor;
      inputStateRef.current = result.nextState;
      setPendingColon(result.nextState.mode === 'colon');
      setIsEmpty(result.newValue === '');
    }
  }, []);

  const handleCopy = useCallback(async () => {
    const text = textareaRef.current?.value ?? '';
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleClear = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.value = '';
      textareaRef.current.focus();
    }
    inputStateRef.current = initialState;
    setPendingColon(false);
    setIsEmpty(true);
  }, []);

  return (
    <div className="space-y-6">

      {/* ── Textarea area ─────────────────────────────────────────────────── */}
      <div className="bg-bg-card rounded-2xl shadow-sm border border-white overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: 'var(--color-primary)' }} />

        <div className="p-6 space-y-4">
          {/* Status bar */}
          <div className="flex items-center justify-between">
            <label
              htmlFor="hebrew-input"
              className="text-sm font-semibold text-text-muted uppercase tracking-wide"
            >
              Hebrew Input
            </label>
            {pendingColon && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: '#FEF3C7', color: '#92400E' }}
              >
                ‹:› — type a, e, or A for hateph vowel
              </span>
            )}
          </div>

          {/* RTL textarea */}
          <textarea
            id="hebrew-input"
            ref={textareaRef}
            dir="rtl"
            lang="he"
            rows={5}
            onKeyDown={handleKeyDown}
            onChange={() => setIsEmpty((textareaRef.current?.value ?? '') === '')}
            placeholder="Type using the key map below…"
            className="w-full rounded-xl border border-gray-200 p-4 text-2xl leading-loose resize-y focus:outline-none focus:ring-2 focus:border-transparent"
            style={{
              fontFamily: 'var(--font-hebrew)',
              color: 'var(--color-text)',
              caretColor: 'var(--color-primary)',
              // @ts-expect-error custom property
              '--tw-ring-color': 'var(--color-primary)',
            }}
          />

          {/* Action buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleClear}
              disabled={isEmpty}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-text-muted transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Clear
            </button>
            <button
              onClick={handleCopy}
              disabled={isEmpty}
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: copied ? '#059669' : 'var(--color-primary)',
                color: 'white',
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Notes ─────────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl px-4 py-3 text-sm"
        style={{ background: '#F0FDF4', color: 'var(--color-text-muted)' }}
      >
        <strong style={{ color: 'var(--color-text)' }}>Tips: </strong>
        Final forms (ך ם ן ף ץ) are inserted automatically when you press Space or Enter.
        Type <kbd className="font-mono bg-white border border-gray-200 rounded px-1 py-0.5 text-xs">:</kbd> then{' '}
        <kbd className="font-mono bg-white border border-gray-200 rounded px-1 py-0.5 text-xs">a</kbd>,{' '}
        <kbd className="font-mono bg-white border border-gray-200 rounded px-1 py-0.5 text-xs">e</kbd>, or{' '}
        <kbd className="font-mono bg-white border border-gray-200 rounded px-1 py-0.5 text-xs">A</kbd> for hateph vowels.
        Type <kbd className="font-mono bg-white border border-gray-200 rounded px-1 py-0.5 text-xs">.</kbd> for dagesh.
      </div>

      {/* ── Reference charts ──────────────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Consonants */}
        <div className="bg-bg-card rounded-2xl shadow-sm border border-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>
              Consonants
            </h2>
          </div>
          <div className="overflow-x-auto scroll-fade-x">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-gray-100">
                  <th className="px-5 py-2 font-medium w-20">Key</th>
                  <th className="px-5 py-2 font-medium w-16">Hebrew</th>
                  <th className="px-5 py-2 font-medium">Name</th>
                </tr>
              </thead>
              <tbody>
                {CONSONANT_ROWS.map((row) => (
                  <tr key={row.name} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-2">
                      <kbd className="font-mono bg-gray-100 rounded px-1.5 py-0.5 text-xs text-text">
                        {row.key}
                      </kbd>
                    </td>
                    <td
                      className="px-5 py-2 text-xl"
                      dir="rtl"
                      style={{ fontFamily: 'var(--font-hebrew)', color: 'var(--color-primary)' }}
                    >
                      {row.hebrew}
                    </td>
                    <td className="px-5 py-2 text-text-muted">{row.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nikud & Special */}
        <div className="bg-bg-card rounded-2xl shadow-sm border border-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>
              Vowels & Diacritics
            </h2>
          </div>
          <div className="overflow-x-auto scroll-fade-x">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-gray-100">
                  <th className="px-5 py-2 font-medium w-20">Key</th>
                  <th className="px-5 py-2 font-medium w-24">Example</th>
                  <th className="px-5 py-2 font-medium">Name</th>
                </tr>
              </thead>
              <tbody>
                {NIKUD_ROWS.map((row) => (
                  <tr key={row.name} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-2">
                      <kbd className="font-mono bg-gray-100 rounded px-1.5 py-0.5 text-xs text-text">
                        {row.key}
                      </kbd>
                    </td>
                    <td
                      className="px-5 py-2 text-xl"
                      dir="rtl"
                      style={{ fontFamily: 'var(--font-hebrew)', color: 'var(--color-primary)' }}
                    >
                      {/* Show diacritic on a pe (פ) so it renders visibly */}
                      פ{row.hebrew}
                    </td>
                    <td className="px-5 py-2 text-text-muted">{row.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
