import { NextResponse } from "next/server";
import { generateRenders, RenderError } from "../../../services/openai-render";
export const runtime = "nodejs";
export const maxDuration = 300;
let active = false;
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  if (active) return NextResponse.json({ error: 'A render is already being generated. Please wait.' }, { status: 429 });
  active = true;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 20_000_000) throw new RenderError('Render request is too large.', 413);
    let body;
    try { body = JSON.parse(raw); } catch { throw new RenderError('Invalid JSON.'); }
    return NextResponse.json({ renders: await generateRenders(body, request.signal) });
  } catch (error) {
    const known = error instanceof RenderError;
    return NextResponse.json({ error: known ? error.message : 'Render generation failed or timed out. Try again.' }, { status: known ? error.status : 502 });
  } finally { active = false; }
}