module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/youtube-transcript-api-js'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['/__fixtures__/'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'youtube-transcript-api-js/**/*.ts',
    '!youtube-transcript-api-js/**/*.d.ts',
    '!youtube-transcript-api-js/**/*.test.ts',
    '!youtube-transcript-api-js/**/*.spec.ts',
    '!youtube-transcript-api-js/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
