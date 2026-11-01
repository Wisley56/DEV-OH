/**
 * Manutenção de contas pelo terminal (só para quem tem a DATABASE_URL):
 *   npm run admin -w @devoh/server -- users
 *   npm run admin -w @devoh/server -- reset-password <usuário>
 *   npm run admin -w @devoh/server -- grant-admin <usuário>
 *   npm run admin -w @devoh/server -- revoke-admin <usuário>
 * A senha nova sai só aqui no terminal; todas as sessões da conta caem.
 * O admin vale no próximo pedido da pessoa (a sessão lê a conta do banco a cada pedido).
 */
import { randomBytes } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { AppConfig } from './config/app-config.js';
import { Argon2Hasher } from './modules/accounts/infrastructure/argon2.hasher.js';
import { openDatabase } from './modules/db/database.js';
import { sessions, users } from './modules/db/schema.js';

const [command, arg] = process.argv.slice(2);
const config = new AppConfig(process.env);
const database = await openDatabase(config.databaseUrl, 1);
const { db } = database;

try {
  if (command === 'users') {
    const rows = await db
      .select({
        username: users.username,
        displayName: users.displayName,
        elo: users.elo,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
    console.table(rows.map((u) => ({ ...u, createdAt: u.createdAt.toISOString().slice(0, 10) })));
  } else if (command === 'reset-password' && arg) {
    const password = randomBytes(9).toString('base64url');
    const hash = await new Argon2Hasher().hash(password);
    const [user] = await db
      .update(users)
      .set({ passwordHash: hash, failedLogins: 0, lockedUntil: null })
      .where(eq(users.username, arg.toLowerCase()))
      .returning({ id: users.id });
    if (!user) throw new Error(`Usuário "${arg}" não existe.`);
    await db.delete(sessions).where(eq(sessions.userId, user.id));
    console.log(`Senha nova de ${arg.toLowerCase()}: ${password}\nPeça para a pessoa trocar em "Minha conta" depois de entrar.`);
  } else if ((command === 'grant-admin' || command === 'revoke-admin') && arg) {
    const isAdmin = command === 'grant-admin';
    const [user] = await db
      .update(users)
      .set({ isAdmin })
      .where(eq(users.username, arg.toLowerCase()))
      .returning({ username: users.username });
    if (!user) throw new Error(`Usuário "${arg}" não existe.`);
    console.log(isAdmin ? `${user.username} agora é admin.` : `${user.username} não é mais admin.`);
  } else {
    console.log('Uso: admin users | admin reset-password <usuário> | admin grant-admin <usuário> | admin revoke-admin <usuário>');
    process.exitCode = 1;
  }
} catch (err) {
  console.error((err as Error).message);
  process.exitCode = 1;
} finally {
  await database.close();
}
