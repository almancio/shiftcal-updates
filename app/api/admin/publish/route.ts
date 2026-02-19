import { NextResponse } from 'next/server';

import { assertAdmin } from '@/lib/auth';
import { deletePublishedUpdate, listPublishedUpdates, publishUpdateArchive } from '@/lib/services/updates-service';

export const runtime = 'nodejs';

function toView(update: Awaited<ReturnType<typeof listPublishedUpdates>>[number]) {
  return {
    id: update.id,
    platform: update.platform,
    channel: update.channel,
    runtimeVersion: update.runtime_version,
    appVersion: update.app_version || 'N/A',
    message: update.message || '',
    createdAt: update.created_at,
    assetsCount: (update.manifest?.assets || []).length || 0
  };
}

export async function GET(request: Request) {
  if (!(await assertAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const updates = await listPublishedUpdates(150);
  return NextResponse.json({ updates: updates.map(toView) });
}

export async function POST(request: Request) {
  if (!(await assertAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();

  const channel = String(formData.get('channel') || 'production').trim();
  const runtimeVersion = String(formData.get('runtimeVersion') || '').trim();
  const appVersion = String(formData.get('appVersion') || '').trim();
  const message = String(formData.get('message') || '').trim();

  const archive = formData.get('archive');

  if (!runtimeVersion) {
    return NextResponse.json({ error: 'runtimeVersion is required.' }, { status: 400 });
  }

  if (!(archive instanceof File)) {
    return NextResponse.json({ error: 'archive file is required.' }, { status: 400 });
  }

  const archiveBuffer = Buffer.from(await archive.arrayBuffer());

  const updates = await publishUpdateArchive({
    archiveBuffer,
    channel,
    runtimeVersion,
    appVersion: appVersion || undefined,
    message: message || undefined
  });

  return NextResponse.json({
    ok: true,
    count: updates.length,
    updates: updates.map(toView)
  });
}

export async function DELETE(request: Request) {
  if (!(await assertAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const updateId = new URL(request.url).searchParams.get('id')?.trim() || '';
  if (!updateId) {
    return NextResponse.json({ error: 'id is required.' }, { status: 400 });
  }

  const result = await deletePublishedUpdate(updateId);
  if (!result.deleted) {
    return NextResponse.json({ error: 'Update not found.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    ...result
  });
}
