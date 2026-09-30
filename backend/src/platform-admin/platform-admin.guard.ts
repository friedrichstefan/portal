import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { HeaderParserService } from '@openmfp/portal-server-lib';
import { AuthzWebhookService } from '@platform-mesh/portal-server-lib/portal-options';
import type { Request } from 'express';

const ORGS_ACCOUNT_GROUP = 'core.platform-mesh.io';
const ORGS_ACCOUNT_RESOURCE = 'accounts';

// In the FGA core module `delete` on an account maps to the `owner` relation.
// Probing `delete accounts` at the root:orgs cluster path therefore tests
// whether the caller owns the root:orgs account — our definition of a Platform
// Administrator.
const OWNER_PROBE_VERB = 'delete';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    private readonly headerParser: HeaderParserService,
    private readonly authz: AuthzWebhookService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.headerParser.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    // Empty organization/accountPath resolve the cluster path to the root:orgs
    // account itself (buildWorkspacePath([]) === 'root:orgs').
    const permissions = await this.authz.checkActionsForResource({
      token,
      organization: '',
      accountPath: '',
      checks: [
        {
          resource: ORGS_ACCOUNT_RESOURCE,
          group: ORGS_ACCOUNT_GROUP,
          actions: [OWNER_PROBE_VERB],
        },
      ],
    });

    // undefined = permission checks disabled (webhook not configured or
    // unreachable). Fail open to match the portal-wide permission behaviour.
    if (permissions === undefined) {
      return true;
    }

    const allowed = permissions.some(
      (p) =>
        p.resource === ORGS_ACCOUNT_RESOURCE &&
        p.actions.includes(OWNER_PROBE_VERB),
    );
    if (!allowed) {
      throw new ForbiddenException('Platform administrator role required');
    }
    return true;
  }
}
