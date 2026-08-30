import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HebrewKeyboard from '../HebrewKeyboard';

// userEvent.setup() needs to be able to override navigator.clipboard.
// We supply a configurable mock so it can take over without throwing.
beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  });
});

function setup() {
  const user = userEvent.setup();
  render(<HebrewKeyboard />);
  const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
  return { user, textarea };
}

describe('HebrewKeyboard rendering', () => {
  it('renders the textarea with RTL direction', () => {
    const { textarea } = setup();
    expect(textarea).toHaveAttribute('dir', 'rtl');
    expect(textarea).toHaveAttribute('lang', 'he');
  });

  it('renders the Copy and Clear buttons initially disabled', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
  });

  it('renders consonant reference table', () => {
    setup();
    expect(screen.getByText('Consonants')).toBeInTheDocument();
    expect(screen.getByText('Alef')).toBeInTheDocument();
    expect(screen.getByText('Tav')).toBeInTheDocument();
  });

  it('renders vowel reference table', () => {
    setup();
    expect(screen.getByText('Vowels & Diacritics')).toBeInTheDocument();
    expect(screen.getByText('Patah')).toBeInTheDocument();
    expect(screen.getByText('Dagesh')).toBeInTheDocument();
  });
});

describe('HebrewKeyboard input', () => {
  it('converts "b" to bet', async () => {
    const { user, textarea } = setup();
    await user.click(textarea);
    await user.keyboard('b');
    expect(textarea.value).toBe('ב');
  });

  it('enables Copy and Clear buttons after typing', async () => {
    const { user, textarea } = setup();
    await user.click(textarea);
    await user.keyboard('b');
    expect(screen.getByRole('button', { name: 'Copy' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear' })).not.toBeDisabled();
  });

  it('types multiple consonants', async () => {
    const { user, textarea } = setup();
    await user.click(textarea);
    // shin + lamed + vav + mem
    await user.keyboard('Slwm');
    expect(textarea.value).toBe('שׁלומ');
  });

  it('converts final mem to ם on space', async () => {
    const { user, textarea } = setup();
    await user.click(textarea);
    await user.keyboard('Slwm ');
    expect(textarea.value).toBe('שׁלום ');
  });

  it('inserts dagesh with "."', async () => {
    const { user, textarea } = setup();
    await user.click(textarea);
    await user.keyboard('b.');
    // bet + dagesh combining character
    expect(textarea.value).toContain('ּ');
  });

  it('passes through Backspace for browser-default deletion', async () => {
    const { user, textarea } = setup();
    await user.click(textarea);
    await user.keyboard('b');
    expect(textarea.value).toBe('ב');
    await user.keyboard('{Backspace}');
    expect(textarea.value).toBe('');
  });
});

describe('HebrewKeyboard buttons', () => {
  it('Clear button empties the textarea', async () => {
    const { user, textarea } = setup();
    await user.click(textarea);
    await user.keyboard('b');
    expect(textarea.value).toBe('ב');
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(textarea.value).toBe('');
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
  });

  it('Copy button shows "Copied!" feedback after clicking', async () => {
    const { user, textarea } = setup();
    await user.click(textarea);
    await user.keyboard('b');
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeInTheDocument();
  });
});

describe('HebrewKeyboard colon state', () => {
  it('shows pending badge when colon is pressed', async () => {
    const { user, textarea } = setup();
    await user.click(textarea);
    await user.keyboard(':');
    // The badge uses the ‹:› character sequence unique to the pending indicator
    expect(screen.getByText(/‹:›/)).toBeInTheDocument();
  });

  it('hides pending badge after hateph key resolves', async () => {
    const { user, textarea } = setup();
    await user.click(textarea);
    await user.keyboard(':a');
    expect(screen.queryByText(/‹:›/)).not.toBeInTheDocument();
  });
});
