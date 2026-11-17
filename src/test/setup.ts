import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount rendered trees and clear the DOM after every test so tests stay isolated.
afterEach(() => {
  cleanup();
});
