import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// T9: no test calls the real model. App.test.tsx keeps the dom project non-empty;
// passWithNoTests applies to the whole run, not per project.
// Two projects: "node" for server, shared, scripts and pure src logic, and "dom"
// (jsdom) for React components. A src test that needs the DOM (hooks, localStorage)
// must be a .tsx file, so it runs in jsdom. Both extend the root config, so they inherit the
// Vite plugins and the `@` and `@shared` aliases.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      passWithNoTests: false,
      projects: [
        {
          extends: true,
          test: {
            name: 'node',
            environment: 'node',
            include: [
              'server/**/*.test.ts',
              'scripts/**/*.test.ts',
              'shared/**/*.test.ts',
              'src/**/*.test.ts',
            ],
          },
        },
        {
          extends: true,
          test: {
            name: 'dom',
            environment: 'jsdom',
            include: ['src/**/*.test.tsx'],
            setupFiles: ['src/test/setup.ts'],
          },
        },
      ],
    },
  }),
);
