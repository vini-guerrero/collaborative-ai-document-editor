import type { SelectOption } from '@/design-system';
import { LENGTHS, TONES, type Length, type Tone } from '@shared/schemas/rewrite';

// D6: labels for the tone and length dropdowns. Typed as records so a new tone fails to compile
// until it has a label.
const TONE_LABELS: Record<Tone, string> = {
  auto: 'Auto',
  formal: 'Formal',
  casual: 'Casual',
  friendly: 'Friendly',
  confident: 'Confident',
  neutral: 'Neutral',
};

const LENGTH_LABELS: Record<Length, string> = {
  shorter: 'Shorter',
  longer: 'Longer',
  same: 'Same length',
};

// Shown in the free instruction input. The hint follows the length setting so it suggests what
// the next pick is likely to touch.
const TONE_HINT = 'Try: make it sound less corporate';
const LENGTH_HINT = 'Try: lead with the main point';

export const TONE_OPTIONS: readonly SelectOption[] = TONES.map((tone) => ({
  value: tone,
  label: TONE_LABELS[tone],
}));

export const LENGTH_OPTIONS: readonly SelectOption[] = LENGTHS.map((length) => ({
  value: length,
  label: LENGTH_LABELS[length],
}));

export function isTone(value: string): value is Tone {
  return TONES.some((tone) => tone === value);
}

export function isLength(value: string): value is Length {
  return LENGTHS.some((length) => length === value);
}

export function instructionPlaceholder(length: Length): string {
  return length === 'same' ? TONE_HINT : LENGTH_HINT;
}
