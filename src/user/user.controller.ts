import { Controller, Get, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // POST /user/setup
  // Creates John (balance: 1000) and Sarah (balance: 500) in one transaction
  @Post('setup')
  async setup(): Promise<{ message: string; users: User[] }> {
    return this.userService.setup();
  }

  // POST /user/send-money
  // Transfers 500 from John to Sarah with QueryRunner transaction
  // Validates user existence and balance in service before executing
  @Post('send-money')
  async sendMoney(): Promise<{ message: string }> {
    return this.userService.sendMoney();
  }

  // POST /user/send-money-no-transaction
  // Deducts 500 from John then deliberately crashes — NO transaction
  // Result: John loses money, Sarah never receives it (data corruption)
  @Post('send-money-no-transaction')
  async sendMoneyNoTransaction(): Promise<{ message: string }> {
    return this.userService.sendMoneyNoTransaction();
  }

  // POST /user/send-money-with-transaction
  // Deducts 500 from John then deliberately crashes — WITH transaction
  // Result: rollback fires, John's balance is fully restored
  @Post('send-money-with-transaction')
  async sendMoneyWithTransaction(): Promise<{ message: string }> {
    return this.userService.sendMoneyWithTransaction();
  }

  // GET /user/balances
  // Returns all users with their current balances
  @Get('balances')
  async getBalances(): Promise<{ users: User[] }> {
    return this.userService.getBalances();
  }
}
