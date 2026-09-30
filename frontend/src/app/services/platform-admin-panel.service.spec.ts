import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ApiExportEntry,
  OrgEntry,
  PolicyEntry,
  PlatformAdminPanelService,
} from './platform-admin-panel.service';

const BASE = '/api/v1/admin';

describe('PlatformAdminPanelService', () => {
  let service: PlatformAdminPanelService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlatformAdminPanelService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('GETs apiexports', () => {
    const payload: ApiExportEntry[] = [
      { name: 'orchestrate', clusterPath: 'root:providers:httpbin' },
    ];
    let result: ApiExportEntry[] | undefined;
    service.listApiExports().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${BASE}/apiexports`);
    expect(req.request.method).toBe('GET');
    req.flush(payload);

    expect(result).toEqual(payload);
  });

  it('GETs orgs', () => {
    const payload: OrgEntry[] = [{ name: 'default' }];
    let result: OrgEntry[] | undefined;
    service.listOrgs().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${BASE}/orgs`);
    expect(req.request.method).toBe('GET');
    req.flush(payload);

    expect(result).toEqual(payload);
  });

  it('GETs policies', () => {
    const payload: PolicyEntry[] = [
      {
        name: 'orchestrate',
        apiExportRef: { name: 'orchestrate', clusterPath: 'root:providers:httpbin' },
        allowPathExpressions: [':root:orgs:default'],
      },
    ];
    let result: PolicyEntry[] | undefined;
    service.listPolicies().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${BASE}/apiexport-policies`);
    expect(req.request.method).toBe('GET');
    req.flush(payload);

    expect(result).toEqual(payload);
  });

  it('POSTs a new policy', () => {
    const body = {
      name: 'orchestrate',
      apiExportName: 'orchestrate',
      clusterPath: 'root:providers:httpbin',
      allowPathExpressions: [':root:orgs:default'],
    };
    service.createPolicy(body).subscribe();

    const req = httpMock.expectOne(`${BASE}/apiexport-policies`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('PUTs an updated policy', () => {
    service
      .updatePolicy('orchestrate', {
        allowPathExpressions: [':root:orgs:*'],
      })
      .subscribe();

    const req = httpMock.expectOne(`${BASE}/apiexport-policies/orchestrate`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ allowPathExpressions: [':root:orgs:*'] });
    req.flush(null);
  });

  it('DELETEs a policy', () => {
    service.deletePolicy('orchestrate').subscribe();

    const req = httpMock.expectOne(`${BASE}/apiexport-policies/orchestrate`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('load() populates signals and clears loading', async () => {
    const loadPromise = service.load();

    httpMock
      .expectOne(`${BASE}/apiexports`)
      .flush([{ name: 'orchestrate', clusterPath: 'root:providers:httpbin' }]);
    httpMock.expectOne(`${BASE}/orgs`).flush([{ name: 'default' }]);
    httpMock.expectOne(`${BASE}/apiexport-policies`).flush([]);

    await loadPromise;

    expect(service.apiExports()).toHaveLength(1);
    expect(service.orgs()).toEqual([{ name: 'default' }]);
    expect(service.policies()).toEqual([]);
    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
  });

  it('load() records an error when a request fails', async () => {
    const loadPromise = service.load();

    httpMock
      .expectOne(`${BASE}/apiexports`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne(`${BASE}/orgs`).flush([]);
    httpMock.expectOne(`${BASE}/apiexport-policies`).flush([]);

    await loadPromise;

    expect(service.error()).toBeTruthy();
    expect(service.loading()).toBe(false);
  });
});
