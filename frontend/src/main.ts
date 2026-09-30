import { provideZonelessChangeDetection } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import {
  PortalComponent,
  PortalOptions,
  providePortal,
} from '@openmfp/portal-ui-lib';
import {
  CustomRoutingConfigServiceImpl,
  HeaderBarConfigServiceImpl,
  LuigiExtendedGlobalContextConfigServiceImpl,
  NavigationRedirectStrategyServiceImpl,
  NodeChangeHookConfigServiceImpl,
  NodeContextProcessingServiceImpl,
  OpenPersistentPanelListener,
  UserProfileConfigServiceImpl,
} from '@platform-mesh/portal-ui-lib/portal-options';
import { routes } from './app/app.routes';
import { PlatformAdminComponent } from './app/components/platform-admin/platform-admin-panel';
import { PMStaticSettingsConfigService } from './app/services/pm-static-settings-config.service';
import { PMCustomGlobalNodesService } from './app/services/pm-custom-global-nodes.service';

const portalOptions: PortalOptions = {
  staticSettingsConfigService: PMStaticSettingsConfigService,
  nodeChangeHookConfigService: NodeChangeHookConfigServiceImpl,
  customMessageListeners: [OpenPersistentPanelListener],
  customGlobalNodesService: PMCustomGlobalNodesService,
  nodeContextProcessingService: NodeContextProcessingServiceImpl,
  luigiExtendedGlobalContextConfigService:
    LuigiExtendedGlobalContextConfigServiceImpl,
  headerBarConfigService: HeaderBarConfigServiceImpl,
  userProfileConfigService: UserProfileConfigServiceImpl,
  routingConfigService: CustomRoutingConfigServiceImpl,
  navigationRedirectStrategy: NavigationRedirectStrategyServiceImpl
};

bootstrapApplication(PortalComponent, {
  providers: [
    provideRouter(routes),
    providePortal(portalOptions),
    provideZonelessChangeDetection(),
  ],
})
  .then((appRef) => {
    // Register the Platform Admin view as a custom element so it can be rendered
    // as a Luigi web-component node (left sidebar, "Settings & Access") without a
    // separate bundle — Luigi attaches an already-registered tag directly.
    if (!customElements.get('pm-platform-admin')) {
      customElements.define(
        'pm-platform-admin',
        createCustomElement(PlatformAdminComponent, {
          injector: appRef.injector,
        }),
      );
    }
  })
  .catch((err) => console.error(err));
