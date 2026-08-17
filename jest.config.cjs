/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // 앱은 ESM(Vite)으로 빌드하지만 Jest 는 CJS 로 실행한다.
        // 테스트는 순수 로직만 다루므로 트랜스파일 단계에서만 CJS 로 낮춘다.
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'node',
          verbatimModuleSyntax: false,
          isolatedModules: false,
        },
      },
    ],
  },
}
