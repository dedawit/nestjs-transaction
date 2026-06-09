import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

ConfigModule.forRoot({ isGlobal: true });

const configService = new ConfigService();
const DB_PORT = configService.getOrThrow<number>('DATABASE_PORT');

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: configService.getOrThrow<string>('HOST_NAME'),
  port: DB_PORT,
  username: configService.getOrThrow<string>('DATABASE_USERNAME'),
  password: configService.getOrThrow<string>('DATABASE_PASSWORD'),
  database: configService.getOrThrow<string>('DATABASE_NAME'),
  entities: [__dirname + '/../**/*.entity.{js,ts}'],
  migrations: [__dirname + '/../src/migrations/*.{js,ts}'],
  synchronize: true,
};

export const dataSource = new DataSource(typeOrmConfig as DataSourceOptions);
