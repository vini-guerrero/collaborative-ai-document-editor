/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Seconds of typing pause before Ambient analyzes (D4). Whole seconds, 1-60; default 5.
  readonly VITE_AI_IDLE_PAUSE_SECONDS?: string;
}
