import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createUser(
    data: { name: string; email: string; balance: number },
    queryRunner: QueryRunner,
  ): Promise<User> {
    const user = queryRunner.manager.create(User, data);
    return queryRunner.manager.save(User, user);
  }

  async upsertUser(
    data: { name: string; email: string; balance: number },
    queryRunner: QueryRunner,
  ): Promise<User> {
    const existing = await queryRunner.manager.findOne(User, {
      where: { email: data.email },
    });
    if (existing) {
      await queryRunner.manager.update(User, existing.id, {
        balance: data.balance,
      });
      return { ...existing, balance: data.balance };
    }
    const user = queryRunner.manager.create(User, data);
    return queryRunner.manager.save(User, user);
  }

  async findByEmail(
    email: string,
    queryRunner?: QueryRunner,
  ): Promise<User | null> {
    const manager = queryRunner ? queryRunner.manager : this.dataSource.manager;
    return manager.findOne(User, { where: { email } });
  }

  async findAll(): Promise<User[]> {
    return this.dataSource.manager.find(User);
  }

  async updateBalance(
    userId: number,
    newBalance: number,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.dataSource.manager;
    await manager.update(User, userId, { balance: newBalance });
  }
}
