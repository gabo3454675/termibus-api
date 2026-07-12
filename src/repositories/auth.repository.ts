import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationMember } from '../entities/auth/organization-member.entity';
import { TerminalAssignment } from '../entities/auth/terminal-assignment.entity';
import { User } from '../entities/auth/user.entity';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    @InjectRepository(TerminalAssignment)
    private readonly assignmentRepo: Repository<TerminalAssignment>,
  ) {}

  async findByEmailWithMemberships(email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { email, activo: true },
      relations: { membresias: { organization: true } },
    });
  }

  async findActiveMembership(
    userId: string,
    orgId: string,
  ): Promise<OrganizationMember | null> {
    return this.memberRepo.findOne({
      where: { user_id: userId, organization_id: orgId, activo: true },
    });
  }

  async findActiveAssignment(
    memberId: string,
  ): Promise<TerminalAssignment | null> {
    return this.assignmentRepo.findOne({
      where: { organization_member_id: memberId, activo: true },
    });
  }

  async findUserById(userId: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { id: userId, activo: true },
    });
  }

  get rawUser(): Repository<User> {
    return this.userRepo;
  }

  get rawMember(): Repository<OrganizationMember> {
    return this.memberRepo;
  }

  get rawAssignment(): Repository<TerminalAssignment> {
    return this.assignmentRepo;
  }
}
