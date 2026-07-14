import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard, PlatformAdminGuard } from '../../common/guards';
import { AdminOrganizationsService } from '../services/admin-organizations.service';
import { AdminBillingService } from '../services/admin-billing.service';
import { AdminPlatformService } from '../services/admin-platform.service';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { CreatePlanDto, UpsertPlanLimitDto } from '../dto/create-plan.dto';
import { ChangePlanDto } from '../dto/change-plan.dto';
import { ChangeStatusDto } from '../dto/change-status.dto';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { CreateFlagDto, UpdateFlagDto } from '../dto/create-flag.dto';
import { ToggleFeatureDto } from '../dto/toggle-feature.dto';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly orgService: AdminOrganizationsService,
    private readonly billingService: AdminBillingService,
    private readonly platformService: AdminPlatformService,
  ) {}

  private parseOptionalInt(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : Math.max(0, parsed);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get('organizations')
  findAllOrganizations(
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.orgService.findAll(
      this.parseOptionalInt(take, 50),
      this.parseOptionalInt(skip, 0),
    );
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get('organizations/:id')
  findOrganization(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgService.findById(id);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post('organizations')
  createOrganization(@Body() body: CreateOrganizationDto) {
    return this.orgService.create(body);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Patch('organizations/:id')
  updateOrganization(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateOrganizationDto,
  ) {
    return this.orgService.update(id, body);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post('organizations/:id/suspend')
  suspendOrganization(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgService.suspend(id);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post('organizations/:id/activate')
  activateOrganization(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgService.activate(id);
  }

  // ============================================================
  // PLANES
  // ============================================================

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get('plans')
  findAllPlans() {
    return this.billingService.findAllPlans();
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post('plans')
  createPlan(@Body() body: CreatePlanDto) {
    return this.billingService.createPlan(body);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Patch('plans/:id')
  updatePlan(@Param('id', ParseUUIDPipe) id: string, @Body() body: Partial<CreatePlanDto>) {
    return this.billingService.updatePlan(id, body);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Delete('plans/:id')
  deletePlan(@Param('id', ParseUUIDPipe) id: string) {
    return this.billingService.deletePlan(id);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post('plans/:id/limits')
  upsertPlanLimit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpsertPlanLimitDto,
  ) {
    return this.billingService.upsertPlanLimit(id, body.recurso, body.limite);
  }

  // ============================================================
  // SUSCRIPCIONES
  // ============================================================

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get('subscriptions')
  findAllSubscriptions(
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.billingService.findAllSubscriptions(
      this.parseOptionalInt(take, 50),
      this.parseOptionalInt(skip, 0),
    );
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Patch('subscriptions/:id/plan')
  changeSubscriptionPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ChangePlanDto,
  ) {
    return this.billingService.changePlan(id, body.plan_id);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Patch('subscriptions/:id/status')
  changeSubscriptionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ChangeStatusDto,
  ) {
    return this.billingService.changeStatus(id, body.estado);
  }

  // ============================================================
  // FACTURAS
  // ============================================================

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get('invoices')
  findAllInvoices(
    @Query('organization_id') orgId?: string,
    @Query('estado') estado?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.billingService.findAllInvoices({
      organization_id: orgId,
      estado,
      date_from: dateFrom,
      date_to: dateTo,
      take: this.parseOptionalInt(take, 50),
      skip: this.parseOptionalInt(skip, 0),
    });
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post('invoices')
  createInvoice(@Body() body: CreateInvoiceDto) {
    return this.billingService.createInvoice(body);
  }

  // ============================================================
  // FEATURE FLAGS (globales)
  // ============================================================

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get('feature-flags')
  findAllFeatureFlags() {
    return this.platformService.findAllFlags();
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post('feature-flags')
  createFeatureFlag(@Body() body: CreateFlagDto) {
    return this.platformService.createFlag(body);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Patch('feature-flags/:id')
  updateFeatureFlag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateFlagDto,
  ) {
    return this.platformService.updateFlag(id, body);
  }

  // ============================================================
  // ORGANIZATION FEATURES (overrides por organización)
  // ============================================================

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get('organizations/:orgId/features')
  findOrgFeatures(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.platformService.findOrgFeatures(orgId);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Patch('organizations/:orgId/features/:flagId')
  toggleOrgFeature(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('flagId', ParseUUIDPipe) flagId: string,
    @Body() body: ToggleFeatureDto,
  ) {
    return this.platformService.toggleOrgFeature(orgId, flagId, body.enabled);
  }

  // ============================================================
  // AUDIT LOGS
  // ============================================================

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get('audit-logs')
  findAuditLogs(
    @Query('action') action?: string,
    @Query('resource_type') resourceType?: string,
    @Query('actor_user_id') actorUserId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.platformService.findAuditLogs({
      action,
      resource_type: resourceType,
      actor_user_id: actorUserId,
      date_from: dateFrom,
      date_to: dateTo,
      take: this.parseOptionalInt(take, 50),
      skip: this.parseOptionalInt(skip, 0),
    });
  }
}
