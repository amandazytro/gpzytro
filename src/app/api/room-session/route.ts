import { NextResponse } from 'next/server';
import { roomSession } from '../../../services/room-session';
export const runtime='nodejs';export const maxDuration=300;
export async function POST(request:Request){
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return NextResponse.json({error:'Origem inválida.'},{status:403});
  try{const raw=await request.text();if(raw.length>500)throw new Error();const body=JSON.parse(raw);if(typeof body.roomId!=='string')throw new Error();return NextResponse.json(await roomSession(body.roomId));}
  catch{return NextResponse.json({error:'Não foi possível preparar o ambiente. Tente abri-lo novamente.'},{status:502});}
}