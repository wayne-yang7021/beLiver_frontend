module.exports = {
    preset: "jest-expo",
    setupFilesAfterEnv: [
      "@testing-library/jest-native/extend-expect",
      "<rootDir>/jest.setup.js"
    ],
    transformIgnorePatterns: [
      "node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|@expo|expo(nent)?|react-native-vector-icons|@expo/vector-icons)"
    ],
    moduleNameMapper: {
      "\\.(jpg|jpeg|png|gif|webp|svg)$": "<rootDir>/__mocks__/fileMock.js",
      "^@/(.*)$": "<rootDir>/$1",
      '^expo-router$': '<rootDir>/__mocks__/expo-routers.tsx'
    },
    testEnvironment: "jsdom",
    collectCoverageFrom: [
      "**/*.{ts,tsx,js,jsx}",
      "!**/coverage/**",
      "!**/node_modules/**",
      "!**/*.config.js",
      "!**/jest.setup.js",
      "!**/babel.config.js",
      "!**/__mocks__/**",
      "!**/expo-env.d.ts",
      "!**/scripts/**"
    ],
    testMatch: [
      "**/__tests__/**/*.(ts|tsx|js|jsx)",
      "**/*.(test|spec).(ts|tsx|js|jsx)"
    ],
    testPathIgnorePatterns: [
      "/node_modules/",
      "/coverage/"
    ]
  };
  