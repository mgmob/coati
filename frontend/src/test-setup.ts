/// <reference types="vitest/globals" />
import 'jsdom';
import { cleanup } from '@testing-library/react';

globalThis.process = {
  ...globalThis.process,
  env: {
    ...globalThis.process?.env,
    NODE_ENV: 'test',
  },
};

afterEach(() => {
  cleanup();
});
