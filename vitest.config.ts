import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// T9: Vitest runs unit tests for pure logic only. Tests never call the real model.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: [
        'src/**/*.test.{ts,tsx}',
        'server/**/*.test.ts',
        'shared/**/*.test.ts',
        'scripts/**/*.test.ts',
      ],
      passWithNoTests: false,
    },
  }),
);
