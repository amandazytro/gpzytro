import {NextResponse} from 'next/server';
import {readPlanInstances,savePlanInstances,InstanceConflict} from '../../../services/plan-instances';
export const runtime='nodejs';
export async function GET(){
 try{return NextResponse.json(await readPlanInstances(),{headers:{'Cache-Control':'no-store'}});}
 catch{return NextResponse.json({error:'Não foi possível carregar as instâncias.'},{status:503});}
}
export async function POST(request:Request){
 const origin=request.headers.get('origin'),url=new URL(request.url),host=request.headers.get('host')??url.host;
 if(origin&&origin!==url.origin&&origin!==url.protocol+'//'+host)return NextResponse.json({error:'Origem inválida.'},{status:403});
 try{
  const reader=request.body?.getReader();if(!reader)throw Error('Lista vazia.');
  const chunks:Uint8Array[]=[];let length=0;
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>2_000_000){await reader.cancel();throw Error('Lista muito grande.');}chunks.push(value);}
  return NextResponse.json(await savePlanInstances(JSON.parse(Buffer.concat(chunks).toString('utf8'))));
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Não foi possível salvar.'},{status:e instanceof InstanceConflict?409:400});}
}
