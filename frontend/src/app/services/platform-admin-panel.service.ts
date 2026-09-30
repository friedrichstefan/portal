import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { Observable, firstValueFrom } from 'rxjs';

export interface ApiExportRef {
  name: string;
  clusterPath: string;
}

export interface ApiExportEntry {
  name: string;
  clusterPath: string;
}

export interface OrgEntry {
  name: string;
}

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

export interface UpdatePolicyRequest {
  allowPathExpressions: string[];
}

@Injectable({ providedIn: 'root' })
export class PlatformAdminPanelService {
  private readonly http = inject(HttpClient);
  private readonly luigiCore = inject(LuigiCoreService);
  private readonly baseUrl = '/api/v1/admin';

  readonly apiExports = signal<ApiExportEntry[]>([]);
  readonly orgs = signal<OrgEntry[]>([]);
  readonly policies = signal<PolicyEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [apiExports, orgs, policies] = await Promise.all([
        firstValueFrom(this.listApiExports()),
        firstValueFrom(this.listOrgs()),
        firstValueFrom(this.listPolicies()),
      ]);
      this.apiExports.set(apiExports);
      this.orgs.set(orgs);
      this.policies.set(policies);
    } catch (err) {
      this.error.set(this.toMessage(err, 'Failed to load platform admin data'));
    } finally {
      this.loading.set(false);
    }
  }

  listApiExports(): Observable<ApiExportEntry[]> {
    return this.http.get<ApiExportEntry[]>(
      `${this.baseUrl}/apiexports`,
      this.authOptions(),
    );
  }

  listOrgs(): Observable<OrgEntry[]> {
    return this.http.get<OrgEntry[]>(`${this.baseUrl}/orgs`, this.authOptions());
  }

  listPolicies(): Observable<PolicyEntry[]> {
    return this.http.get<PolicyEntry[]>(
      `${this.baseUrl}/apiexport-policies`,
      this.authOptions(),
    );
  }

  createPolicy(request: CreatePolicyRequest): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/apiexport-policies`,
      request,
      this.authOptions(),
    );
  }

  updatePolicy(name: string, request: UpdatePolicyRequest): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/apiexport-policies/${encodeURIComponent(name)}`,
      request,
      this.authOptions(),
    );
  }

  deletePolicy(name: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/apiexport-policies/${encodeURIComponent(name)}`,
      this.authOptions(),
    );
  }

  // The backend guards these endpoints with a bearer token (see
  // PlatformAdminGuard); attach it the same way the portal's own services do.
  private authOptions(): { headers?: Record<string, string> } {
    const idToken = this.luigiCore.getAuthData()?.idToken;
    return idToken ? { headers: { Authorization: `Bearer ${idToken}` } } : {};
  }

  private toMessage(err: unknown, fallback: string): string {
    return err instanceof Error && err.message ? err.message : fallback;
  }
}
