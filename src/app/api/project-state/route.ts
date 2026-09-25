import { NextResponse } from 'next/server';
import { readProjectState,saveRoomComposition } from '../../../services/project-state';
export const runtime='nodejs';
export async function GET(){try{return NextResponse.json(await readProjectState(),{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Não foi possível abrir as composições salvas.'},{status:503});}}
export async function POST(request:Request){
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin&&origin!==new URL(request.url).protocol+'//'+request.headers.get('host'))return NextResponse.json({error:'Origem inválida.'},{status:403});
  try{const text=await request.text();if(text.length>2000)throw new Error('Pedido inválido.');const body=JSON.parse(text);if(typeof body.roomId!=='string'||body.moodboardId!==undefined&&typeof body.moodboardId!=='string'||body.imageId!==undefined&&typeof body.imageId!=='string'||body.moodboardNumber!==undefined&&!['1','2','3'].includes(body.moodboardNumber))throw new Error('Pedido inválido.');return NextResponse.json({saved:await saveRoomComposition(body)});}
  catch{return NextResponse.json({error:'Não foi possível salvar. Confira o ambiente e a composição escolhida.'},{status:400});}
}