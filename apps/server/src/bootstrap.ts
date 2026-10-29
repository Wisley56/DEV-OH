import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AppSocketAdapter } from './common/socket-adapter.js';
import { AppConfig } from './config/app-config.js';

/** Cria e sobe o servidor; `port` sobrescreve a configuração (os testes e2e usam 0 e sem log). */
export async function bootstrap(port?: number, logs = true) {
  const app = await NestFactory.create(AppModule, { logger: logs ? ['error', 'warn', 'log'] : ['error'] });
  const config = app.get(AppConfig);
  app.useWebSocketAdapter(new AppSocketAdapter(app));
  app.enableCors({ origin: config.corsOrigin });
  app.enableShutdownHooks();
  await app.listen(port ?? config.port, '0.0.0.0');
  Logger.log(`DEV-OH! server ouvindo na porta ${port ?? config.port}`, 'Bootstrap');
  return app;
}
