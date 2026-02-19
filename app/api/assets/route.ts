import { NextResponse } from 'next/server';

import { getRequestIp, hashIp, resolveContentType } from '@/lib/expo';
import { readStoredAsset } from '@/lib/storage';
import { trackEvent } from '@/lib/services/events-service';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const fileName = new URL(request.url).searchParams.get('file');

  if (!fileName) {
    return NextResponse.json({ error: 'Missing file query parameter.' }, { status: 400 });
  }

  try {
    const assetBuffer = await readStoredAsset(fileName);

    const contentType = resolveContentType(fileName);
    const ipHash = hashIp(getRequestIp(request));

    await trackEvent({
      eventType: 'asset_download',
      ipHash,
      details: {
        file: fileName,
        contentType,
        size: assetBuffer.byteLength
      }
    });

    const bytes = Uint8Array.from(assetBuffer.values());
    const body = new Blob([bytes], { type: contentType });

    return new NextResponse(body, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=31536000, immutable'
      }
    });
  } catch {
    return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
  }
}
