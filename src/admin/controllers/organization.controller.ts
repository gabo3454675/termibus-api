import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard, SuperAdminOrOrgRoleGuard, OrgRoles } from '../../common/guards';
import { OrganizationRole } from '../../common/enums';
import { AdminBillingService } from '../services/admin-billing.service';
import { OrganizationService } from '../services/organization.service';
import { CurrentUser } from '../../common/decorators';
import type { AuthUser } from '../../auth/auth.types';
import { CreateTerminalDto, UpdateTerminalDto } from '../dto/create-terminal.dto';
import { CreateInvitationDto } from '../dto/create-invitation.dto';
import { ChangeMyPlanDto } from '../dto/change-my-plan.dto';

@Controller('organization')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(
    private readonly billingService: AdminBillingService,
    private readonly orgService: OrganizationService,
  ) {}

  private parseOptionalInt(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : Math.max(0, parsed);
  }

  @UseGuards(SuperAdminOrOrgRoleGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.BILLING_ADMIN)
  @Get('subscription')
  getMySubscription(@CurrentUser() user: AuthUser) {
    return this.billingService.findSubscriptionByOrg(user.orgId);
  }

  @UseGuards(SuperAdminOrOrgRoleGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @Post('subscription/change-plan')
  changeMyPlan(
    @CurrentUser() user: AuthUser,
    @Body() body: ChangeMyPlanDto,
  ) {
    return this.billingService.changePlanByOrg(user.orgId, body.plan_id);
  }

  @UseGuards(SuperAdminOrOrgRoleGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.BILLING_ADMIN)
  @Get('invoices')
  getMyInvoices(@CurrentUser() user: AuthUser) {
    return this.billingService.findInvoicesByOrg(user.orgId);
  }

  @UseGuards(SuperAdminOrOrgRoleGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.BILLING_ADMIN)
  @Get('usage')
  getMyUsage(@CurrentUser() user: AuthUser) {
    return this.billingService.findUsageByOrg(user.orgId);
  }

  // === MIEMBROS ===

  @UseGuards(SuperAdminOrOrgRoleGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @Get('members')
  getMembers(
    @CurrentUser() user: AuthUser,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.orgService.findMembers(
      user.orgId,
      this.parseOptionalInt(take, 50),
      this.parseOptionalInt(skip, 0),
    );
  }

  @UseGuards(SuperAdminOrOrgRoleGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @Patch('members/:id/role')
  changeMemberRole(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) memberId: string,
    @Body('rol') newRole: OrganizationRole,
  ) {
    return this.orgService.changeMemberRole(user.orgId, memberId, newRole, user.orgRole);
  }

  @UseGuards(SuperAdminOrOrgRoleGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @Delete('members/:id')
  deactivateMember(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) memberId: string,
  ) {
    return this.orgService.deactivateMember(user.orgId, memberId, user.orgRole);
  }

  // === INVITACIONES ===

  @UseGuards(SuperAdminOrOrgRoleGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @Post('invitations')
  createInvitation(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateInvitationDto,
  ) {
    return this.orgService.createInvitation(user.orgId, body, user.sub);
  }

  @UseGuards(SuperAdminOrOrgRoleGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @Get('invitations')
  getInvitations(@CurrentUser() user: AuthUser) {
    return this.orgService.findInvitations(user.orgId);
  }

  @UseGuards(SuperAdminOrOrgRoleGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @Delete('invitations/:id')
  revokeInvitation(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) invitationId: string,
  ) {
    return this.orgService.revokeInvitation(user.orgId, invitationId);
  }

  // === TERMINALES ===

  @UseGuards(SuperAdminOrOrgRoleGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @Get('terminals')
  getTerminals(@CurrentUser() user: AuthUser) {
    return this.orgService.findTerminals(user.orgId);
  }

  @UseGuards(SuperAdminOrOrgRoleGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @Post('terminals')
  createTerminal(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateTerminalDto,
  ) {
    return this.orgService.createTerminal(user.orgId, body);
  }

  @UseGuards(SuperAdminOrOrgRoleGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @Patch('terminals/:id')
  updateTerminal(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) terminalId: string,
    @Body() body: UpdateTerminalDto,
  ) {
    return this.orgService.updateTerminal(user.orgId, terminalId, body);
  }

  @UseGuards(SuperAdminOrOrgRoleGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @Delete('terminals/:id')
  deactivateTerminal(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) terminalId: string,
  ) {
    return this.orgService.deactivateTerminal(user.orgId, terminalId);
  }
}
