import nextJest from 'next/jest.js';
import type { Config } from 'jest';

// next/jest applies the project's own Next config, so tests compile with the
// same transforms, path aliases and CSS handling the app does.
const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
};

export default createJestConfig(config);
