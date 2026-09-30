import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@kubernetes/client-node/dist/gen/middleware.js', () => ({
  PromiseMiddlewareWrapper: class {
    constructor(public readonly middleware: unknown) {}
  },
}));

import { PlatformAdminService } from './platform-admin.service.js';
import type {
  CreatePolicyRequest,
  UpdatePolicyRequest,
} from './platform-admin.types.js';

type KcpMock = {
  getKcpK8sCustomObjectsApi: jest.Mock;
  getKcpWorkspaceUrl: jest.Mock;
};

describe('PlatformAdminService', () => {
  let listClusterCustomObject: jest.Mock;
  let createClusterCustomObject: jest.Mock;
  let patchClusterCustomObject: jest.Mock;
  let deleteClusterCustomObject: jest.Mock;
  let kcp: KcpMock;
  let service: PlatformAdminService;

  beforeEach(() => {
    listClusterCustomObject = jest.fn(() => Promise.resolve({ items: [] }));
    createClusterCustomObject = jest.fn(() => Promise.resolve({}));
    patchClusterCustomObject = jest.fn(() => Promise.resolve({}));
    deleteClusterCustomObject = jest.fn(() => Promise.resolve({}));
    kcp = {
      getKcpK8sCustomObjectsApi: jest.fn(() => ({
        listClusterCustomObject,
        createClusterCustomObject,
        patchClusterCustomObject,
        deleteClusterCustomObject,
      })),
      getKcpWorkspaceUrl: jest.fn(
        (_org, _account, workspacePath) =>
          `https://kcp.example/clusters/${workspacePath}`,
      ),
    };
    service = new PlatformAdminService(kcp as never);
  });

  describe('listApiExports', () => {
    it('lists exports per provider and filters out core kcp exports', async () => {
      listClusterCustomObject.mockImplementation((descriptor: { plural: string }) => {
        if (descriptor.plural === 'workspaces') {
          return Promise.resolve({
            items: [{ metadata: { name: 'httpbin-provider' } }],
          });
        }
        if (descriptor.plural === 'apiexports') {
          return Promise.resolve({
            items: [
              { metadata: { name: 'orchestrate.platform-mesh.io' } },
              { metadata: { name: 'tenancy.kcp.io' } },
              { metadata: { name: 'cache.kcp.io' } },
              { metadata: { name: 'migration.kcp.io' } },
              { metadata: { name: 'topology.kcp.io' } },
              { metadata: { name: 'shards.core.kcp.io' } },
            ],
          });
        }
        return Promise.resolve({ items: [] });
      });

      const result = await service.listApiExports();

      expect(result).toEqual([
        {
          name: 'orchestrate.platform-mesh.io',
          clusterPath: 'root:providers:httpbin-provider',
        },
      ]);
      expect(listClusterCustomObject).toHaveBeenCalledWith(
        expect.objectContaining({ version: 'v1alpha2', plural: 'apiexports' }),
        expect.objectContaining({ middleware: expect.any(Array) }),
      );
      expect(kcp.getKcpWorkspaceUrl).toHaveBeenCalledWith(
        undefined,
        undefined,
        'root:providers:httpbin-provider',
      );
    });

    it('returns empty when no providers exist', async () => {
      listClusterCustomObject.mockResolvedValue({ items: [] } as never);
      await expect(service.listApiExports()).resolves.toEqual([]);
    });
  });

  describe('listOrgs', () => {
    it('maps workspaces in root:orgs to org entries', async () => {
      listClusterCustomObject.mockResolvedValue({
        items: [{ metadata: { name: 'default' } }],
      } as never);

      const result = await service.listOrgs();

      expect(result).toEqual([{ name: 'default' }]);
      expect(listClusterCustomObject).toHaveBeenCalledWith(
        expect.objectContaining({ plural: 'workspaces' }),
        expect.objectContaining({ middleware: expect.any(Array) }),
      );
      expect(kcp.getKcpWorkspaceUrl).toHaveBeenCalledWith(
        undefined,
        undefined,
        'root:orgs',
      );
    });
  });

  describe('listPolicies', () => {
    it('maps policies and defaults missing spec fields', async () => {
      listClusterCustomObject.mockResolvedValue({
        items: [
          {
            metadata: { name: 'orchestrate.platform-mesh.io' },
            spec: {
              apiExportRef: {
                name: 'orchestrate.platform-mesh.io',
                clusterPath: 'root:providers:httpbin-provider',
              },
              allowPathExpressions: [':root:orgs:default'],
            },
          },
          { metadata: { name: 'no-spec' } },
        ],
      } as never);

      const result = await service.listPolicies();

      expect(result).toEqual([
        {
          name: 'orchestrate.platform-mesh.io',
          apiExportRef: {
            name: 'orchestrate.platform-mesh.io',
            clusterPath: 'root:providers:httpbin-provider',
          },
          allowPathExpressions: [':root:orgs:default'],
        },
        {
          name: 'no-spec',
          apiExportRef: { name: '', clusterPath: '' },
          allowPathExpressions: [],
        },
      ]);
      expect(listClusterCustomObject).toHaveBeenCalledWith(
        expect.objectContaining({ plural: 'apiexportpolicies' }),
        expect.objectContaining({ middleware: expect.any(Array) }),
      );
    });
  });

  describe('createPolicy', () => {
    it('creates an APIExportPolicy in root:orgs', async () => {
      const dto: CreatePolicyRequest = {
        name: 'orchestrate.platform-mesh.io',
        apiExportName: 'orchestrate.platform-mesh.io',
        clusterPath: 'root:providers:httpbin-provider',
        allowPathExpressions: [':root:orgs:default'],
      };

      await service.createPolicy(dto);

      expect(kcp.getKcpWorkspaceUrl).toHaveBeenCalledWith(
        undefined,
        undefined,
        'root:orgs',
      );
      expect(createClusterCustomObject).toHaveBeenCalledWith(
        expect.objectContaining({
          group: 'core.platform-mesh.io',
          version: 'v1alpha1',
          plural: 'apiexportpolicies',
          body: expect.objectContaining({
            kind: 'APIExportPolicy',
            metadata: { name: 'orchestrate.platform-mesh.io' },
            spec: {
              apiExportRef: {
                name: 'orchestrate.platform-mesh.io',
                clusterPath: 'root:providers:httpbin-provider',
              },
              allowPathExpressions: [':root:orgs:default'],
            },
          }),
        }),
        expect.objectContaining({ middleware: expect.any(Array) }),
      );
    });
  });

  describe('updatePolicy', () => {
    it('patches allowPathExpressions of a policy', async () => {
      const dto: UpdatePolicyRequest = {
        allowPathExpressions: [':root:orgs:*'],
      };

      await service.updatePolicy('orchestrate.platform-mesh.io', dto);

      expect(patchClusterCustomObject).toHaveBeenCalledWith(
        expect.objectContaining({
          group: 'core.platform-mesh.io',
          version: 'v1alpha1',
          plural: 'apiexportpolicies',
          name: 'orchestrate.platform-mesh.io',
          body: { spec: { allowPathExpressions: [':root:orgs:*'] } },
        }),
        expect.objectContaining({ middleware: expect.any(Array) }),
      );
    });
  });

  describe('deletePolicy', () => {
    it('deletes a policy by name', async () => {
      await service.deletePolicy('orchestrate.platform-mesh.io');

      expect(deleteClusterCustomObject).toHaveBeenCalledWith(
        expect.objectContaining({
          group: 'core.platform-mesh.io',
          version: 'v1alpha1',
          plural: 'apiexportpolicies',
          name: 'orchestrate.platform-mesh.io',
        }),
        expect.objectContaining({ middleware: expect.any(Array) }),
      );
    });
  });
});
