// The <pm-platform-admin> custom element is registered by the portal shell's
// main bundle (see src/main.ts). This module exists only so the Luigi
// web-component node has a valid module URL to point at; because the node sets
// webcomponent.tagName to an already-registered element, Luigi attaches it
// directly and never imports this file. The default export is a harmless
// fallback in case a future Luigi version does import it.
export default class PmPlatformAdminPlaceholder extends HTMLElement {}
