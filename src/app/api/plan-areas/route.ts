import {NextResponse} from 'next/server';
import {readPlanAreas,savePlanAreas,AreaConflict} from '../../../services/plan-areas';
export const runtime='nodejs';
export async function GET(){
 try{return NextResponse.json(await readPlanAreas(),{headers:{'Cache-Control':'no-store'}});}
 catch{return NextResponse.json({error:'Não foi possível carregar as áreas.'},{status:503});}
}
export async function POST(request:Request){
 const origin=request.headers.get('origin'),url=new URL(request.url),host=request.headers.get('host')??url.host;
 if(origin&&origin!==url.origin&&origin!==url.protocol+'//'+host)return NextResponse.json({error:'Origem inválida.'},{status:403});
 try{
  const reader=request.body?.getReader();if(!reader)throw Error('Áreas vazias.');
  const chunks:Uint8Array[]=[];let length=0;
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>100000){await reader.cancel();throw Error('Áreas muito grandes.');}chunks.push(value);}
  return NextResponse.json(await savePlanAreas(JSON.parse(Buffer.concat(chunks).toString('utf8'))));
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Não foi possível salvar.'},{status:e instanceof AreaConflict?409:400});}
}
