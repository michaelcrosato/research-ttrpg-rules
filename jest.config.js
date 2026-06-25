module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^\\.\\./app\\.js$': '<rootDir>/dist/app.js',
    '^\\.\\./search-worker\\.js$': '<rootDir>/dist/search-worker.js',
  },
  testPathIgnorePatterns: ['<rootDir>/scratch/'],
};
