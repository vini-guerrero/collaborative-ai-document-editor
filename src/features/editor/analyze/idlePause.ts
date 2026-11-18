// D4 (amended): how long the typing pause lasts before Ambient analyzes the paragraph.
export const DEFAULT_IDLE_PAUSE_SECONDS = 5;
const MIN_IDLE_PAUSE_SECONDS = 1;
const MAX_IDLE_PAUSE_SECONDS = 60;
const MS_PER_SECOND = 1000;

// Parses the Vite setting (whole seconds). Anything missing, non-integer or out of range falls back
// to the default, so a bad value never disables analysis or makes it hammer the model.
export const parseIdlePauseMs = (raw: string | undefined): number => {
  const trimmed = raw?.trim() ?? '';
  if (!/^\d+$/.test(trimmed)) {
    return DEFAULT_IDLE_PAUSE_SECONDS * MS_PER_SECOND;
  }
  const seconds = Number(trimmed);
  if (seconds < MIN_IDLE_PAUSE_SECONDS || seconds > MAX_IDLE_PAUSE_SECONDS) {
    return DEFAULT_IDLE_PAUSE_SECONDS * MS_PER_SECOND;
  }
  return seconds * MS_PER_SECOND;
};
