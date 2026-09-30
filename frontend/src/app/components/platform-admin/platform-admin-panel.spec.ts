import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ApiExportEntry,
  OrgEntry,
  PolicyEntry,
} from '../../services/platform-admin-panel.service';
import { PlatformAdminComponent } from './platform-admin-panel';

const BASE = '/api/v1/admin';

interface LoadData {
  apiExports: ApiExportEntry[];
  orgs: OrgEntry[];
  policies: PolicyEntry[];
}

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('PlatformAdminComponent', () => {
  let fixture: ComponentFixture<PlatformAdminComponent>;
  let component: PlatformAdminComponent;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PlatformAdminComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  function flushLoad(data: LoadData): void {
    httpMock.expectOne(`${BASE}/apiexports`).flush(data.apiExports);
    httpMock.expectOne(`${BASE}/orgs`).flush(data.orgs);
    httpMock.expectOne(`${BASE}/apiexport-policies`).flush(data.policies);
  }

  async function init(data: LoadData): Promise<void> {
    fixture = TestBed.createComponent(PlatformAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushLoad(data);
    await tick();
    fixture.detectChanges();
  }

  const exportA: ApiExportEntry = {
    name: 'exp-a',
    clusterPath: 'root:providers:p1',
  };
  const exportB: ApiExportEntry = {
    name: 'exp-b',
    clusterPath: 'root:providers:p2',
  };
  const policyA: PolicyEntry = {
    name: 'exp-a',
    apiExportRef: { name: 'exp-a', clusterPath: 'root:providers:p1' },
    allowPathExpressions: [':root:orgs:default'],
  };

  it('renders one merged row per apiexport with derived status', async () => {
    await init({
      apiExports: [exportA, exportB],
      orgs: [{ name: 'default' }, { name: 'foo' }],
      policies: [policyA],
    });

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Enabled');
    expect(text).toContain('Not enabled');

    const first = component.rows()[0];
    expect(first.enabled).toBe(true);
    expect(first.allowedOrgs).toEqual(['default']);
    const second = component.rows()[1];
    expect(second.enabled).toBe(false);
    expect(second.allowedOrgs).toEqual([]);
  });

  it('shows the empty state when there are no apiexports', async () => {
    await init({ apiExports: [], orgs: [], policies: [] });

    expect(fixture.nativeElement.querySelector('.state--empty')).toBeTruthy();
  });

  it('shows the error state when loading fails', async () => {
    fixture = TestBed.createComponent(PlatformAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock
      .expectOne(`${BASE}/apiexports`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne(`${BASE}/orgs`).flush([]);
    httpMock.expectOne(`${BASE}/apiexport-policies`).flush([]);
    await tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.state--error')).toBeTruthy();
  });

  it('POSTs a create when a row without a policy gains orgs', async () => {
    await init({
      apiExports: [exportB],
      orgs: [{ name: 'default' }, { name: 'foo' }],
      policies: [],
    });

    const row = component.rows()[0];
    component.startEdit(row);
    component.toggleOrg('foo', true);

    const savePromise = component.save(row);

    const req = httpMock.expectOne(`${BASE}/apiexport-policies`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'exp-b',
      apiExportName: 'exp-b',
      clusterPath: 'root:providers:p2',
      allowPathExpressions: [':root:orgs:foo'],
    });
    req.flush(null);

    await tick();
    flushLoad({ apiExports: [exportB], orgs: [{ name: 'foo' }], policies: [] });
    await savePromise;
  });

  it('PUTs an update when an existing policy set changes', async () => {
    await init({
      apiExports: [exportA],
      orgs: [{ name: 'default' }, { name: 'foo' }],
      policies: [policyA],
    });

    const row = component.rows()[0];
    component.startEdit(row);
    component.toggleOrg('foo', true);

    const savePromise = component.save(row);

    const req = httpMock.expectOne(`${BASE}/apiexport-policies/exp-a`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      allowPathExpressions: [':root:orgs:default', ':root:orgs:foo'],
    });
    req.flush(null);

    await tick();
    flushLoad({ apiExports: [exportA], orgs: [], policies: [] });
    await savePromise;
  });

  it('DELETEs the policy when all orgs are removed', async () => {
    await init({
      apiExports: [exportA],
      orgs: [{ name: 'default' }],
      policies: [policyA],
    });

    const row = component.rows()[0];
    component.startEdit(row);
    component.toggleOrg('default', false);

    const savePromise = component.save(row);

    const req = httpMock.expectOne(`${BASE}/apiexport-policies/exp-a`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    await tick();
    flushLoad({ apiExports: [exportA], orgs: [], policies: [] });
    await savePromise;
  });

  it('makes no request when an existing set is unchanged', async () => {
    await init({
      apiExports: [exportA],
      orgs: [{ name: 'default' }],
      policies: [policyA],
    });

    const row = component.rows()[0];
    component.startEdit(row);

    const savePromise = component.save(row);
    await tick();
    flushLoad({ apiExports: [exportA], orgs: [{ name: 'default' }], policies: [policyA] });
    await savePromise;

    httpMock.verify();
    expect(component.editingKey()).toBeNull();
  });
});
