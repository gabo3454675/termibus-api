import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../entities/tenant/organization.entity';
import { Terminal } from '../entities/tenant/terminal.entity';

@Injectable()
export class TenantRepository {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(Terminal)
    private readonly terminalRepo: Repository<Terminal>,
  ) {}

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.orgRepo.findOne({ where: { slug } });
  }

  async findOrganizationById(id: string): Promise<Organization | null> {
    return this.orgRepo.findOne({ where: { id } });
  }

  async findTerminalsByOrganization(orgId: string): Promise<Terminal[]> {
    return this.terminalRepo.find({
      where: { organization_id: orgId },
    });
  }

  async findTerminalById(id: string): Promise<Terminal | null> {
    return this.terminalRepo.findOne({ where: { id } });
  }

  get rawOrganization(): Repository<Organization> {
    return this.orgRepo;
  }

  get rawTerminal(): Repository<Terminal> {
    return this.terminalRepo;
  }
}
