# APIExport Enablement UI — Design (Slice A)

**Date:** 2026-09-30
**Branch:** `feat/apiexport-enablement-ui`

## Context

With recent changes to how bindability of APIExports is controlled, APIExports
are **not bindable by default**. A Platform Administrator needs a UI to control
where APIExports are allowed to be bound (used) — i.e. which organizations may
consume a given APIExport. When enabled for an org, the APIExport shows up on
that org's marketplace.

Enablement is expressed as an `APIExportPolicy` custom resource in the
`root:orgs` workspace, whose `allowPathExpressions` list the org paths permitted
to bind the referenced APIExport.

## Scope

**Slice A (this spec):** UI + backend data endpoints. No FGA / authorization
layer yet — the backend uses its own kcp credentials. FGA (who may become a
Platform Administrator, authorization of these operations) is a later slice.

Out of scope for Slice A: FGA store changes, member-management for the
Platform Administrator role, a dedicated virtual-workspace implementation.

## Architecture

```
Browser (Luigi)
  └─ Node "Platform Admin" under "Settings & Access"  → Route /platform-admin
        └─ PlatformAdminComponent (Angular standalone, signals, OnPush, zoneless)
              └─ PlatformAdminPanelService  ──HTTP──▶  Backend REST  api/v1/admin/*
                                                            └─ PlatformAdminService
                                                                  └─ KcpKubernetesService ──▶ kcp
                                                                       ├─ root:providers  (read APIExports)
                                                                       └─ root:orgs       (read/write orgs + APIExportPolicies)
```

## Backend (NestJS)

New under `backend/src/platform-admin/`:

- `platform-admin.types.ts`
- `platform-admin.service.ts` — uses `KcpKubernetesService` from
  `@platform-mesh/portal-server-lib`. GVRs:
  - APIExports: `apis.kcp.io/v1alpha2` (plural `apiexports`) — **v1alpha2**, the
    old compiled artifacts used v1alpha1 which is stale.
  - APIExportPolicy: `core.platform-mesh.io/v1alpha1` (plural
    `apiexportpolicies`) in `root:orgs`.
  - Workspaces: `tenancy.kcp.io/v1alpha1` (plural `workspaces`).
- `platform-admin.controller.ts`
- Registration via `PortalModule.create()` options in `app.module.ts`.

A reference implementation exists (compiled, source removed) at
`backend/dist/platform-admin/` — use it as a guide for how the service uses
`KcpKubernetesService`, but correct the APIExport version to v1alpha2.

### REST contract (pinned)

```
GET api/v1/admin/apiexports
→ 200 ApiExportEntry[]
  [ { "name": "orchestrate.platform-mesh.io",
      "clusterPath": "root:providers:httpbin-provider" } ]
  Core kcp exports are filtered out: tenancy.kcp.io, cache.kcp.io,
  migration.kcp.io, topology.kcp.io, shards.core.kcp.io.

GET api/v1/admin/orgs
→ 200 OrgEntry[]
  [ { "name": "default" } ]

GET api/v1/admin/apiexport-policies
→ 200 PolicyEntry[]
  [ { "name": "orchestrate.platform-mesh.io",
      "apiExportRef": { "name": "orchestrate.platform-mesh.io",
                        "clusterPath": "root:providers:httpbin-provider" },
      "allowPathExpressions": [ ":root:orgs:default" ] } ]

POST api/v1/admin/apiexport-policies
  body CreatePolicyRequest:
  { "name": "...", "apiExportName": "...", "clusterPath": "root:providers:...",
    "allowPathExpressions": [ ":root:orgs:default" ] }
→ 201, empty body (Promise<void>)

PUT api/v1/admin/apiexport-policies/:name
  body UpdatePolicyRequest: { "allowPathExpressions": [ ":root:orgs:default" ] }
→ 200, empty body (Promise<void>)

DELETE api/v1/admin/apiexport-policies/:name
→ 204, empty body (Promise<void>)
```

### Types

```typescript
export interface ApiExportEntry { name: string; clusterPath: string; }
export interface OrgEntry { name: string; }
export interface ApiExportRef { name: string; clusterPath: string; }
export interface PolicyEntry {
  name: string;
  apiExportRef: ApiExportRef;
  allowPathExpressions: string[];
}
export interface CreatePolicyRequest {
  name: string;
  apiExportName: string;
  clusterPath: string;
  allowPathExpressions: string[];
}
export interface UpdatePolicyRequest { allowPathExpressions: string[]; }
```

## Frontend (Angular)

New under `frontend/src/app/components/platform-admin/`:

- `platform-admin-panel.ts` / `.html` / `.scss` — standalone component,
  `signal()`/`computed()`/`input()`, OnPush, works under zoneless CD.
- `frontend/src/app/services/platform-admin-panel.service.ts` — signal-based
  HTTP client for the REST endpoints above.

### View: one merged table

Row = APIExport. Columns:

- **Name** — APIExport name
- **Provider** — clusterPath
- **Status** — "Enabled" (a policy exists with ≥1 allowed org) / "Not enabled"
- **Allowed organizations** — chips/list of org names, inline-editable

All candidate APIExports are shown, including those with no policy (as
"Not enabled"), so the admin can enable them.

Inline edit of the org set for a row maps to policy operations:
- no policy yet + orgs added → `POST` create policy
- policy exists + org set changed → `PUT` update `allowPathExpressions`
- policy exists + all orgs removed → `DELETE` policy

Loading, error, and empty states required.

### Merge / mapping logic

- A policy matches an APIExport when
  `policy.apiExportRef.name === apiExport.name` and
  `policy.apiExportRef.clusterPath === apiExport.clusterPath`.
- Org name ⇄ path expression:
  `default` ⇄ `:root:orgs:default`; `*` (all orgs) ⇄ `:root:orgs:*`.

## Nav & route

- Route in `app.routes.ts`: `/platform-admin` → `PlatformAdminComponent`.
- A locally-registered Luigi node under the "Settings & Access" section,
  following the Terminal-node pattern in `pm-custom-global-nodes.service.ts`.
  The exact category/parent wiring is confirmed by inspecting the live Luigi
  node tree in the browser.

## APIExportPolicy resource

```yaml
apiVersion: core.platform-mesh.io/v1alpha1
kind: APIExportPolicy
metadata: { name: <apiexport-name> }
spec:
  apiExportRef: { name: <name>, clusterPath: root:providers:<provider> }
  allowPathExpressions: [ ":root:orgs:<org>" ]   # or ":root:orgs:*" for all
```

One policy per APIExport, carrying the list of allowed org path expressions.

## Testing

- Backend (Jest): service with kcp calls mocked; controller.
- Frontend (Vitest): component (render, inline-edit flow, empty/error states);
  service (HTTP mocked).

## Live testing

Without `--example-data` there are no enable-able APIExports (only core kcp
exports, which are filtered). To exercise the feature live, create a test
APIExport in a provider workspace (or reinstall with `--example-data` for the
httpbin `orchestrate.platform-mesh.io` flow).
