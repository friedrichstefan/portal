import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PlatformAdminGuard } from './platform-admin.guard.js';
import { PlatformAdminService } from './platform-admin.service.js';
import type {
  ApiExportEntry,
  CreatePolicyRequest,
  OrgEntry,
  PolicyEntry,
  UpdatePolicyRequest,
} from './platform-admin.types.js';

@Controller('api/v1/admin')
@UseGuards(PlatformAdminGuard)
export class PlatformAdminController {
  constructor(private readonly svc: PlatformAdminService) {}

  @Get('apiexports')
  listApiExports(): Promise<ApiExportEntry[]> {
    return this.svc.listApiExports();
  }

  @Get('orgs')
  listOrgs(): Promise<OrgEntry[]> {
    return this.svc.listOrgs();
  }

  @Get('apiexport-policies')
  listPolicies(): Promise<PolicyEntry[]> {
    return this.svc.listPolicies();
  }

  @Post('apiexport-policies')
  createPolicy(@Body() dto: CreatePolicyRequest): Promise<void> {
    return this.svc.createPolicy(dto);
  }

  @Put('apiexport-policies/:name')
  updatePolicy(
    @Param('name') name: string,
    @Body() dto: UpdatePolicyRequest,
  ): Promise<void> {
    return this.svc.updatePolicy(name, dto);
  }

  @Delete('apiexport-policies/:name')
  @HttpCode(204)
  deletePolicy(@Param('name') name: string): Promise<void> {
    return this.svc.deletePolicy(name);
  }
}
