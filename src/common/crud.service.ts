import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';

@Injectable()
export class CrudService<T extends ObjectLiteral> {
  constructor(private readonly repo: Repository<T>) {}

  findAll() {
    return this.repo.find({ order: { id: 'ASC' } as never });
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } as never });
  }

  create(data: Partial<T>) {
    const entity = this.repo.create(data as never);
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<T>) {
    await this.repo.update(id, data as never);
    return this.findOne(id);
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    if (item) await this.repo.remove(item);
    return { deleted: true };
  }
}
