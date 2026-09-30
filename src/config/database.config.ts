import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function databaseConfig(config: ConfigService): TypeOrmModuleOptions {
  const port = Number(config.getOrThrow<string>('DB_PORT'));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be an integer between 1 and 65535');
  }

  return {
    type: 'postgres',
    host: config.getOrThrow<string>('DB_HOST'),
    port,
    username: config.getOrThrow<string>('DB_USERNAME'),
    password: config.getOrThrow<string>('DB_PASSWORD'),
    database: config.getOrThrow<string>('DB_DATABASE'),
    autoLoadEntities: true,
    // 초기 로컬 개발에서만 명시적으로 허용한다. 운영에서는 항상 false.
    synchronize:
      config.get<string>('NODE_ENV') === 'development' &&
      config.get<string>('DB_SYNCHRONIZE') === 'true',
  };
}
