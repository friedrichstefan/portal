import { Module } from '@nestjs/common';
import { PortalModule, PortalModuleOptions } from '@openmfp/portal-server-lib';
import {
  AccountEntityContextProvider,
  AuthzWebhookService,
  KcpKubernetesService,
  KubernetesServiceProvidersService,
  PermissionsController,
  PermissionsProxyService,
  PMAuthConfigProvider,
  PMLogoutService,
  PMPortalContextService,
  PMRequestContextProvider,
} from '@platform-mesh/portal-server-lib/portal-options';
import { config } from 'dotenv';
import * as path from 'node:path';
import { PlatformAdminController } from './platform-admin/platform-admin.controller.js';
import { PlatformAdminGuard } from './platform-admin/platform-admin.guard.js';
import { PlatformAdminService } from './platform-admin/platform-admin.service.js';

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

config({ path: './.env' });

const portalOptions: PortalModuleOptions = {
  frontendDistSources: path.join(
    __dirname,
    '../..',
    'frontend/dist/frontend/browser',
  ),
  requestContextProvider: PMRequestContextProvider,
  portalContextProvider: PMPortalContextService,
  entityContextProviders: {
    account: AccountEntityContextProvider,
  },
  additionalProviders: [
    KcpKubernetesService,
    AccountEntityContextProvider,
    PMPortalContextService,
    PMRequestContextProvider,
    PMAuthConfigProvider,
    PermissionsProxyService,
    AuthzWebhookService,
    PlatformAdminService,
    PlatformAdminGuard,
  ],
  additionalControllers: [PermissionsController, PlatformAdminController],
  serviceProviderService: KubernetesServiceProvidersService,
  authConfigProvider: PMAuthConfigProvider,
  logoutCallbackProvider: PMLogoutService,
};

@Module({
  imports: [PortalModule.create(portalOptions)],
})
export class AppModule {}
