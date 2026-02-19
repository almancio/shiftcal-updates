#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

function getArg(flag, fallback = '') {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

const server = getArg('--server');
const token = getArg('--token');
const archive = getArg('--archive');
const runtimeVersion = getArg('--runtime');
const channel = getArg('--channel', 'production');
const appVersion = getArg('--app-version', '');
const message = getArg('--message', '');

if (!server || !token || !archive || !runtimeVersion) {
  console.error(
    'Uso: node scripts/publish-update.mjs --server https://updates.tudominio.com --token <ADMIN_TOKEN> --archive ./update.zip --runtime 2.0.0 [--channel production] [--app-version 2.3.1] [--message "bugfix"]'
  );
  process.exit(1);
}

const archiveBuffer = await readFile(archive);
const file = new File([archiveBuffer], path.basename(archive), { type: 'application/zip' });

const formData = new FormData();
formData.append('channel', channel);
formData.append('runtimeVersion', runtimeVersion);
formData.append('appVersion', appVersion);
formData.append('message', message);
formData.append('archive', file);

const response = await fetch(`${server.replace(/\/$/, '')}/api/admin/publish`, {
  method: 'POST',
  headers: {
    'x-admin-token': token
  },
  body: formData
});

const body = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error('Error publicando update:', body);
  process.exit(1);
}

console.log('Update publicada correctamente:', JSON.stringify(body, null, 2));
