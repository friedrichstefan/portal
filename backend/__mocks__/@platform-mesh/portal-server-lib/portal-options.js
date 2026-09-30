// Mock implementation of @platform-mesh/portal-server-lib/portal-options for Jest.
// The package only ships an ESM ("import") export condition, which Jest's
// CommonJS resolver cannot load; this manual mock stands in during tests.
// eslint-disable-next-line no-undef
module.exports = {
  KcpKubernetesService: class KcpKubernetesService {},
};
