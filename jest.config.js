module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@env$': '<rootDir>/src/__mocks__/env.ts',
    '^react-native-mmkv$': '<rootDir>/src/__mocks__/react-native-mmkv.ts',
    '^react-native-reanimated$': '<rootDir>/src/__mocks__/react-native-reanimated.js',
    '^react-native-screens$': '<rootDir>/src/__mocks__/react-native-screens.ts',
    '^react-native-gesture-handler$': '<rootDir>/src/__mocks__/react-native-gesture-handler.ts',
    '^@rnmapbox/maps$': '<rootDir>/src/__mocks__/@rnmapbox/maps.ts',
    '\\.css$': '<rootDir>/src/__mocks__/fileMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-gesture-handler|nativewind|lucide-react-native|react-native-svg|react-native-screens|react-native-safe-area-context)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__mocks__/**',
    '!src/global.css',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  globals: {
    __DEV__: true,
  },
};
