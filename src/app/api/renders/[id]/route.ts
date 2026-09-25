import { readRender } from "../../../../services/openai-render";
export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const image = await readRender((await params).id);
    return new Response(new Uint8Array(image), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=31536000, immutable' } });
  } catch { return new Response('Render not found.', { status: 404 }); }
}