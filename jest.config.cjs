/** @type {import('ts-jest').JestConfigWithTsJest} */

// 앱은 ESM(Vite)으로 빌드하지만 Jest 는 CJS 로 실행한다.
// 트랜스파일 단계에서만 CJS 로 낮춘다.
const transform = {
  '^.+\\.tsx?$': [
    'ts-jest',
    {
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'node',
        verbatimModuleSyntax: false,
        isolatedModules: false,
        // supabase/functions/_shared 는 Deno 용이라 상대 import 에 .ts 를 붙인다.
        allowImportingTsExtensions: true,
        jsx: 'react-jsx',
      },
    },
  ],
}

const shared = {
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform,
}

module.exports = {
  projects: [
    // 로직·스토어 테스트는 DOM 이 필요 없으므로 가벼운 node 환경에서 돌린다.
    {
      ...shared,
      displayName: 'logic',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
    },
    // 컴포넌트 테스트만 jsdom 을 쓴다. 확장자(.tsx)로 갈린다.
    {
      ...shared,
      displayName: 'ui',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/__tests__/**/*.test.tsx'],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup-ui.ts'],
    },
  ],
}
