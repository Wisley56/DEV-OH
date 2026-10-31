import { Global, Inject, Injectable, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';
import { AppConfig } from '../../config/app-config.js';
import { openDatabase, type Database, type Db } from './database.js';

/** Token de injeção do banco (Drizzle). */
export const DB = Symbol('DB');
const DATABASE = Symbol('DATABASE');

/** Fecha o pool quando o servidor desliga. */
@Injectable()
class DatabaseCloser implements OnApplicationShutdown {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async onApplicationShutdown() {
    await this.database.close();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      inject: [AppConfig],
      // As migrations rodam aqui, antes de o servidor começar a escutar.
      useFactory: async (config: AppConfig) => {
        const database = await openDatabase(config.databaseUrl, config.dbPoolMax);
        Logger.log(`Banco pronto (${config.databaseUrl.split(':')[0]}).`, 'Database');
        return database;
      },
    },
    { provide: DB, inject: [DATABASE], useFactory: (d: Database): Db => d.db },
    DatabaseCloser,
  ],
  exports: [DB],
})
export class DbModule {}
