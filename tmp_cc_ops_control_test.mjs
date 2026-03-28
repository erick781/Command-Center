import fs from 'node:fs';

function loadEnv(filePath) {
  const env = {};
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
  return env;
}

const env = loadEnv('/root/command-center-v2/.env.local');
const email = env.CC_AUDIT_EMAIL;
const password = env.CC_AUDIT_PASSWORD;
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!email || !password || !supabaseUrl || !anonKey) {
  throw new Error('Missing audit auth env.');
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const authUrl = supabaseUrl + '/auth/v1/token?grant_type=password';
const authResponse = await fetch(authUrl, {
  method: 'POST',
  headers: {
    apikey: anonKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password }),
});

if (!authResponse.ok) {
  throw new Error('Auth failed: ' + authResponse.status);
}

const session = await authResponse.json();
const cookie = 'sb-' + projectRef + '-auth-token=base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const json = await response.json().catch(() => null);
  return { response, json };
}

const initial = await fetchJson('http://127.0.0.1:3001/api/ops/automations');
if (!initial.response.ok) {
  throw new Error('Initial GET failed: ' + initial.response.status + ' ' + JSON.stringify(initial.json));
}

const workflow = initial.json && initial.json.workflows && initial.json.workflows[0];
if (!workflow || !workflow.id) {
  throw new Error('No workflow found.');
}

const deactivate = await fetchJson('http://127.0.0.1:3001/api/ops/automations', {
  method: 'POST',
  body: JSON.stringify({ workflowId: workflow.id, action: 'deactivate' }),
});
if (!deactivate.response.ok) {
  throw new Error('Deactivate failed: ' + deactivate.response.status + ' ' + JSON.stringify(deactivate.json));
}

const activate = await fetchJson('http://127.0.0.1:3001/api/ops/automations', {
  method: 'POST',
  body: JSON.stringify({ workflowId: workflow.id, action: 'activate' }),
});
if (!activate.response.ok) {
  throw new Error('Activate failed: ' + activate.response.status + ' ' + JSON.stringify(activate.json));
}

const finalSnapshot = await fetchJson('http://127.0.0.1:3001/api/ops/automations');
if (!finalSnapshot.response.ok) {
  throw new Error('Final GET failed: ' + finalSnapshot.response.status);
}

const finalWorkflow = finalSnapshot.json.workflows.find((item) => item.id === workflow.id);
console.log(JSON.stringify({
  workflowId: workflow.id,
  initialActive: workflow.active,
  deactivateStatus: deactivate.response.status,
  activateStatus: activate.response.status,
  finalActive: finalWorkflow ? finalWorkflow.active : null,
  reachable: finalSnapshot.json.reachable,
}));
