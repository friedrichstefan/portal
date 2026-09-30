export default {
  testEnvironment: 'node',
  coverageReporters: ['text', 'cobertura', 'lcov'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  rootDir: 'src',
  testRegex: '.spec.ts$',
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage',
  passWithNoTests: true,
  resolver: '<rootDir>/../jest-custom-resolver.cjs',
  moduleNameMapper: {
    '^@openmfp/portal-server-lib$':
      '<rootDir>/../__mocks__/@openmfp/portal-server-lib.js',
    '^@platform-mesh/portal-server-lib/portal-options$':
      '<rootDir>/../__mocks__/@platform-mesh/portal-server-lib/portal-options.js',
  },
};
