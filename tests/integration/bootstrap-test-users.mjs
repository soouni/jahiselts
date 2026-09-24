import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const projectRef = 'pipwbfmgmuiisrvnnnmw';
const url = process.env.RLS_TEST_URL;
const publishableKey = process.env.RLS_TEST_PUBLISHABLE_KEY;
const secretKey = process.env.RLS_TEST_SECRET_KEY;
if (!url || !publishableKey || !secretKey) throw new Error('Määra RLS_TEST_URL, RLS_TEST_PUBLISHABLE_KEY ja RLS_TEST_SECRET_KEY ainult kohalikus terminalis.');
if (new URL(url).hostname !== `${projectRef}.supabase.co`) throw new Error(`Peatasin töö: URL peab viitama ainult eraldi testprojektile ${projectRef}.`);
if (process.env.RLS_TEST_ACK !== 'I_UNDERSTAND_THIS_IS_A_DISPOSABLE_PROJECT') throw new Error('Määra RLS_TEST_ACK=I_UNDERSTAND_THIS_IS_A_DISPOSABLE_PROJECT.');

const refFile = await readFile('supabase/.temp/project-ref', 'utf8').catch(() => '');
if (refFile.trim() !== projectRef) throw new Error(`Peatasin töö: kohalik Supabase CLI link peab olema ${projectRef}.`);

const roles = [
  { key: 'ADMIN', role: 'admin', name: 'RLS test admin', active: true },
  { key: 'MEMBER', role: 'member', name: 'RLS test liige', active: true },
  { key: 'VIEWER', role: 'viewer', name: 'RLS test vaataja', active: true },
  { key: 'INACTIVE', role: 'member', name: 'RLS test deaktiveeritud', active: false },
];
const suffix = randomBytes(4).toString('hex');
for (const item of roles) item.email = `rls-${item.key.toLowerCase()}-${suffix}@example.test`;
const fixtureDir = await mkdtemp(join(tmpdir(), 'parnjoe-rls-fixture-'));
const migrationDir = 'supabase/migrations';
const migrationName = `${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}_temporary_rls_test_users.sql`;
const migrationPath = join(migrationDir, migrationName);
const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
const created = [];

try {
  // Seed only invitation rows by a temporary Supabase CLI migration, and only
  // after confirming both the URL and CLI link point to the dedicated test ref.
  // All invitations start active so an optional Before User Created hook allows
  // each Auth account to be created; the inactive case is disabled afterwards
  // through the authenticated admin RPC.
  const values = roles.map(x => `('${x.email.replaceAll("'", "''")}', '${x.name}', '${x.role}', true)`).join(',\n  ');
  await writeFile(migrationPath, `insert into public.memberships(email,display_name,role,active) values\n  ${values};\n`);
  execFileSync('npx', ['supabase@latest', 'db', 'push', '--linked', '--yes'], { stdio: 'inherit' });
  await rm(migrationPath, { force: true });

  const password = `Rls-${randomBytes(20).toString('base64url')}!9`;
  for (const item of roles) {
    const { data, error } = await admin.auth.admin.createUser({ email: item.email, password, email_confirm: true });
    if (error) throw error;
    item.user = data.user;
    created.push(data.user.id);
  }
  for (const item of roles) {
    const account = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: loginError } = await account.auth.signInWithPassword({ email: item.email, password });
    if (loginError) throw loginError;
    const { data, error } = await account.rpc('join_club');
    if (error) throw error;
    if (!data?.length) throw new Error(`Testkonto ${item.key} ei sidunud testliikmesust.`);
    item.client = account;
  }
  const { error: deactivateError } = await roles[0].client.rpc('admin_member', {
    member_email: roles[3].email,
    member_name: roles[3].name,
    member_role: roles[3].role,
    member_active: false,
  });
  if (deactivateError) throw deactivateError;
  const lines = [
    `RLS_TEST_URL=${url}`,
    `RLS_TEST_PUBLISHABLE_KEY=${publishableKey}`,
    'RLS_TEST_ACK=I_UNDERSTAND_THIS_IS_A_DISPOSABLE_PROJECT',
  ];
  for (const item of roles) lines.push(`RLS_TEST_${item.key}_EMAIL=${item.email}`, `RLS_TEST_${item.key}_PASSWORD=${password}`);
  const envPath = 'tests/integration/.test-users.env';
  await writeFile(envPath, `${lines.join('\n')}\n`, { mode: 0o600, flag: 'wx' });
  console.log(`Testkontod valmisid ainult projektis ${projectRef}. Ajutine testimaterjal salvestati faili ${envPath}.`);
  console.log('RLS_TEST_SECRET_KEY ei salvestatud faili ega väljastatud. Kustuta testprojekt pärast auditit Supabase Dashboardist, kui seda enam vaja pole.');
} catch (error) {
  await rm(migrationPath, { force: true });
  for (const id of created) await admin.auth.admin.deleteUser(id).catch(() => {});
  throw error;
} finally {
  await rm(fixtureDir, { recursive: true, force: true });
}
