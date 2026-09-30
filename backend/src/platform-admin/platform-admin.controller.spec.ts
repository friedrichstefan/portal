import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('./platform-admin.service.js', () => ({
  PlatformAdminService: class {},
}));

import { PlatformAdminController } from './platform-admin.controller.js';
import type { PlatformAdminService } from './platform-admin.service.js';
import type {
  CreatePolicyRequest,
  UpdatePolicyRequest,
} from './platform-admin.types.js';

describe('PlatformAdminController', () => {
  let svc: jest.Mocked<
    Pick<
      PlatformAdminService,
      | 'listApiExports'
      | 'listOrgs'
      | 'listPolicies'
      | 'createPolicy'
      | 'updatePolicy'
      | 'deletePolicy'
    >
  >;
  let controller: PlatformAdminController;

  beforeEach(() => {
    svc = {
      listApiExports: jest.fn(),
      listOrgs: jest.fn(),
      listPolicies: jest.fn(),
      createPolicy: jest.fn(),
      updatePolicy: jest.fn(),
      deletePolicy: jest.fn(),
    };
    controller = new PlatformAdminController(svc as never);
  });

  it('delegates listApiExports', () => {
    const expected = [
      { name: 'a', clusterPath: 'root:providers:p' },
    ];
    svc.listApiExports.mockResolvedValue(expected);
    expect(controller.listApiExports()).resolves.toBe(expected);
    expect(svc.listApiExports).toHaveBeenCalledTimes(1);
  });

  it('delegates listOrgs', () => {
    const expected = [{ name: 'default' }];
    svc.listOrgs.mockResolvedValue(expected);
    expect(controller.listOrgs()).resolves.toBe(expected);
  });

  it('delegates listPolicies', () => {
    const expected = [
      {
        name: 'a',
        apiExportRef: { name: 'a', clusterPath: 'root:providers:p' },
        allowPathExpressions: [':root:orgs:default'],
      },
    ];
    svc.listPolicies.mockResolvedValue(expected);
    expect(controller.listPolicies()).resolves.toBe(expected);
  });

  it('delegates createPolicy', () => {
    const dto: CreatePolicyRequest = {
      name: 'a',
      apiExportName: 'a',
      clusterPath: 'root:providers:p',
      allowPathExpressions: [':root:orgs:default'],
    };
    svc.createPolicy.mockResolvedValue(undefined);
    controller.createPolicy(dto);
    expect(svc.createPolicy).toHaveBeenCalledWith(dto);
  });

  it('delegates updatePolicy', () => {
    const dto: UpdatePolicyRequest = {
      allowPathExpressions: [':root:orgs:*'],
    };
    svc.updatePolicy.mockResolvedValue(undefined);
    controller.updatePolicy('a', dto);
    expect(svc.updatePolicy).toHaveBeenCalledWith('a', dto);
  });

  it('delegates deletePolicy', () => {
    svc.deletePolicy.mockResolvedValue(undefined);
    controller.deletePolicy('a');
    expect(svc.deletePolicy).toHaveBeenCalledWith('a');
  });
});
