import 'reflect-metadata';
import { ConsoleLogger, Logger, type LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { HttpDomainFilter } from './common/http-domain.filter.js';
import { AppSocketAdapter } from './common/socket-adapter.js';
import { AppConfig } from './config/app-config.js';

/** Cria e sobe o servidor; `port` sobrescreve a configuração (os testes e2e usam 0 e sem log). */
export async function bootstrap(port?: number, logs = true) {
  const levels: LogLevel[] = logs ? ['error', 'warn', 'log'] : ['error'];
  // Em produção o log sai em JSON, uma linha por evento, para filtrar no Railway.
  const logger = new AppConfig().production ? new ConsoleLogger({ json: true, logLevels: levels }) : levels;
  const app = await NestFactory.create(AppModule, { logger });
  const config = app.get(AppConfig);
  // Rotas HTTP em /api (o web repassa /api e /socket.io); o health check do Railway fica na raiz.
  app.setGlobalPrefix('api', { exclude: ['health', '/'] });
  app.use(helmet());
  app.useGlobalFilters(new HttpDomainFilter());
  app.useWebSocketAdapter(new AppSocketAdapter(app));
  app.enableCors({ origin: config.corsOrigin });
  app.enableShutdownHooks();
  // '::' escuta em IPv6 e IPv4: a rede privada do Railway (*.railway.internal) é IPv6.
  await app.listen(port ?? config.port, '::');
  Logger.log(`DEV-OH! server ouvindo na porta ${port ?? config.port}`, 'Bootstrap');
  return app;
}
