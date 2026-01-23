module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/youtube-transcript-api-js'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'youtube-transcript-api-js/**/*.ts',
    '!youtube-transcript-api-js/**/*.d.ts',
    '!youtube-transcript-api-js/**/*.test.ts',
    '!youtube-transcript-api-js/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
