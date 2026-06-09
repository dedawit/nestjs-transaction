import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from './user.entity';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // Create John and Sarah inside a single QueryRunner transaction
  async setup(): Promise<{ message: string; users: User[] }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const john = await this.userRepository.upsertUser(
        { name: 'John', email: 'john@example.com', balance: 1000.0 },
        queryRunner,
      );
      const sarah = await this.userRepository.upsertUser(
        { name: 'Sarah', email: 'sarah@example.com', balance: 500.0 },
        queryRunner,
      );

      await queryRunner.commitTransaction();
      return { message: 'Users created successfully', users: [john, sarah] };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // Send 500 from John to Sarah — with QueryRunner transaction
  // Validation (existence + balance) happens here in the service
  async sendMoney(): Promise<{ message: string }> {
    const fromEmail = 'john@example.com';
    const toEmail = 'sarah@example.com';
    const amount = 500;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sender = await this.userRepository.findByEmail(
        fromEmail,
        queryRunner,
      );
      if (!sender) throw new NotFoundException(`User ${fromEmail} not found`);

      const receiver = await this.userRepository.findByEmail(
        toEmail,
        queryRunner,
      );
      if (!receiver) throw new NotFoundException(`User ${toEmail} not found`);

      if (Number(sender.balance) < amount) {
        throw new BadRequestException(
          `Insufficient balance. John has ${sender.balance}, needs ${amount}`,
        );
      }

      await this.userRepository.updateBalance(
        sender.id,
        Number(sender.balance) - amount,
        queryRunner,
      );
      await this.userRepository.updateBalance(
        receiver.id,
        Number(receiver.balance) + amount,
        queryRunner,
      );

      await queryRunner.commitTransaction();
      return {
        message: `Successfully transferred ${amount} from ${fromEmail} to ${toEmail}`,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // Send money WITHOUT transaction — deducts from John then crashes
  // Demonstrates data corruption: John loses money, Sarah never receives it
  async sendMoneyNoTransaction(): Promise<{ message: string }> {
    const fromEmail = 'john@example.com';
    const toEmail = 'sarah@example.com';
    const amount = 500;

    const sender = await this.userRepository.findByEmail(fromEmail);
    if (!sender) throw new NotFoundException(`User ${fromEmail} not found`);

    const receiver = await this.userRepository.findByEmail(toEmail);
    if (!receiver) throw new NotFoundException(`User ${toEmail} not found`);

    if (Number(sender.balance) < amount) {
      throw new BadRequestException(
        `Insufficient balance. John has ${sender.balance}`,
      );
    }

    // Step 1: Deduct from John — persisted immediately, no transaction
    await this.userRepository.updateBalance(
      sender.id,
      Number(sender.balance) - amount,
    );

    // Simulated crash between the two operations — Sarah never gets credited
    throw new InternalServerErrorException(
      'Crash after deducting from John! No transaction — Sarah never received the money. Check balances to confirm data corruption.',
    );

    // Step 2: NEVER REACHED — Sarah's credit is lost due to the crash above
    // eslint-disable-next-line no-unreachable
    await this.userRepository.updateBalance(
      receiver!.id,
      Number(receiver!.balance) + amount,
    );
  }

  // Send money WITH transaction — deducts from John then crashes
  // Demonstrates rollback: John's balance is restored automatically
  async sendMoneyWithTransaction(): Promise<{ message: string }> {
    const fromEmail = 'john@example.com';
    const toEmail = 'sarah@example.com';
    const amount = 500;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sender = await this.userRepository.findByEmail(
        fromEmail,
        queryRunner,
      );
      if (!sender) throw new NotFoundException(`User ${fromEmail} not found`);

      const receiver = await this.userRepository.findByEmail(
        toEmail,
        queryRunner,
      );
      if (!receiver) throw new NotFoundException(`User ${toEmail} not found`);

      // Step 1: Deduct from John inside the transaction
      await this.userRepository.updateBalance(
        sender.id,
        Number(sender.balance) - amount,
        queryRunner,
      );

      // Simulated crash between the two operations — triggers rollback
      throw new InternalServerErrorException(
        'Crash after deducting from John! Transaction rolls back — check balances to confirm John still has his money.',
      );

      // Step 2: NEVER REACHED — transaction rolls back before Sarah is credited
      // eslint-disable-next-line no-unreachable
      await this.userRepository.updateBalance(
        receiver!.id,
        Number(receiver!.balance) + amount,
        queryRunner,
      );

      // NEVER REACHED — commit would finalize the transfer if no crash
      await queryRunner.commitTransaction();
      return {
        message: `Successfully transferred ${amount} from ${fromEmail} to ${toEmail}`,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // Return all users with their current balances
  async getBalances(): Promise<{ users: User[] }> {
    const users = await this.userRepository.findAll();
    return { users };
  }
}
