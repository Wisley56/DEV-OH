import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DB } from '../src/modules/db/db.module.js';
import type { Db } from '../src/modules/db/database.js';
import { users } from '../src/modules/db/schema.js';
import { signUp, startServer, type TestServer } from './support.js';

const SITE = 'http://site.test';

/** Acesso ao painel admin no servidor: sessão (401), conta admin (403) e DEV_ADMIN_USERNAMES. */
describe('acesso admin (e2e)', () => {
  let server: TestServer;
  let url: string;

  beforeAll(async () => {
    server = await startServer({ CORS_ORIGIN: SITE, RATE_AUTH_PER_MIN: '20', DEV_ADMIN_USERNAMES: 'chefe, dev_*' });
    url = server.url;
  });
  afterAll(() => server.close());

  const adminMe = (cookie?: string) => fetch(`${url}/api/admin/me`, { headers: { origin: SITE, ...(cookie && { cookie }) } });
  const me = async (cookie: string) =>
    (await (await fetch(`${url}/api/auth/me`, { headers: { origin: SITE, cookie } })).json()) as { isAdmin: boolean };

  it('sem sessão responde 401', async () => {
    const res = await adminMe();
    expect(res.status).toBe(401);
  });

  it('conta comum responde 403, sem vazar nada', async () => {
    const cookie = await signUp(url, 'comum', SITE);
    const res = await adminMe(cookie);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ statusCode: 403, message: 'Só administradores podem fazer isso.' });
    expect((await me(cookie)).isAdmin).toBe(false);
  });

  it('DEV_ADMIN_USERNAMES dá admin por nome exato ou prefixo', async () => {
    for (const name of ['chefe', 'dev_ana']) {
      const cookie = await signUp(url, name, SITE);
      const res = await adminMe(cookie);
      expect(res.status, name).toBe(200);
      expect(res.headers.get('cache-control')).toBe('no-store');
      expect(await res.json()).toMatchObject({ username: name, isAdmin: true });
      expect((await me(cookie)).isAdmin).toBe(true);
    }
    expect((await adminMe(await signUp(url, 'chefe2', SITE))).status).toBe(403);
  });

  it('is_admin no banco vale no próximo pedido, e tirar também', async () => {
    const cookie = await signUp(url, 'douglas', SITE);
    const db = server.app.get<Db>(DB);
    await db.update(users).set({ isAdmin: true }).where(eq(users.username, 'douglas'));
    expect((await adminMe(cookie)).status).toBe(200);
    await db.update(users).set({ isAdmin: false }).where(eq(users.username, 'douglas'));
    expect((await adminMe(cookie)).status).toBe(403);
  });
});
