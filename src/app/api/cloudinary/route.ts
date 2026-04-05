import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!;
const API_KEY    = process.env.CLOUDINARY_API_KEY!;
const API_SECRET = process.env.CLOUDINARY_API_SECRET!;
const FOLDER     = process.env.CLOUDINARY_FOLDER ?? 'shining-stars/vouchers';

// ── SHA-1 signed params for Cloudinary ───────────────────────
function signParams(params: Record<string, string>): string {
  const str =
    Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&') + API_SECRET;
  return crypto.createHash('sha1').update(str).digest('hex');
}

// ── POST /api/cloudinary ──────────────────────────────────────
// Body: { image: "data:image/jpeg;base64,..." }
// Returns: { url, public_id }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image } = body;
    if (!image) return NextResponse.json({ error: 'No image' }, { status: 400 });

    // Strip data URL prefix
    const base64Data = image.includes(',') ? image.split(',')[1] : image;

    const timestamp = String(Math.floor(Date.now() / 1000));
    const params: Record<string, string> = { folder: FOLDER, timestamp };
    const signature = signParams(params);

    const form = new FormData();
    form.append('file',      `data:image/jpeg;base64,${base64Data}`);
    form.append('api_key',   API_KEY);
    form.append('timestamp', timestamp);
    form.append('folder',    FOLDER);
    form.append('signature', signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: form }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[Cloudinary] Upload failed:', err);
      return NextResponse.json({ error: 'Upload failed', detail: err }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ url: data.secure_url, public_id: data.public_id });

  } catch (e: any) {
    console.error('[Cloudinary] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── GET /api/cloudinary?action=info ──────────────────────────
export async function GET() {
  return NextResponse.json({ ready: true, folder: FOLDER, cloud: CLOUD_NAME });
}
