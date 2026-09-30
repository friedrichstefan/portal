import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PlatformAdminGuard } from './platform-admin.guard.js';

function contextWith(): ExecutionContext {
  const request = {};
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('PlatformAdminGuard', () => {
  let extractBearerToken: jest.Mock;
  let checkActionsForResource: jest.Mock;
  let guard: PlatformAdminGuard;

  beforeEach(() => {
    extractBearerToken = jest.fn(() => 'token-123');
    checkActionsForResource = jest.fn();
    guard = new PlatformAdminGuard(
      { extractBearerToken } as never,
      { checkActionsForResource } as never,
    );
  });

  it('rejects when no bearer token is present', async () => {
    extractBearerToken.mockReturnValue(undefined);
    await expect(guard.canActivate(contextWith())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(checkActionsForResource).not.toHaveBeenCalled();
  });

  it('probes owner of root:orgs via delete on accounts', async () => {
    checkActionsForResource.mockResolvedValue([
      { resource: 'accounts', actions: ['delete'] },
    ] as never);

    await expect(guard.canActivate(contextWith())).resolves.toBe(true);
    expect(checkActionsForResource).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token-123',
        organization: '',
        accountPath: '',
        checks: [
          {
            resource: 'accounts',
            group: 'core.platform-mesh.io',
            actions: ['delete'],
          },
        ],
      }),
    );
  });

  it('fails open when checks are disabled (undefined)', async () => {
    checkActionsForResource.mockResolvedValue(undefined as never);
    await expect(guard.canActivate(contextWith())).resolves.toBe(true);
  });

  it('forbids when the owner probe is not allowed', async () => {
    checkActionsForResource.mockResolvedValue([
      { resource: 'accounts', actions: [] },
    ] as never);
    await expect(guard.canActivate(contextWith())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
