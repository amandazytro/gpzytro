import {NextResponse} from 'next/server';
import {readPlanProductCatalog,savePlanProduct} from '../../../services/plan-product-catalog';
export const runtime='nodejs';
export async function GET(){
 try{return NextResponse.json({products:await readPlanProductCatalog()},{headers:{'Cache-Control':'no-store'}});}
 catch{return NextResponse.json({error:'Não foi possível carregar os produtos cadastrados.'},{status:503});}
}
export async function POST(request:Request){
 const origin=request.headers.get('origin'),url=new URL(request.url),host=request.headers.get('host')??url.host;
 if(origin&&origin!==url.origin&&origin!==url.protocol+'//'+host)return NextResponse.json({error:'Origem inválida.'},{status:403});
 try{
  const reader=request.body?.getReader();if(!reader)throw new Error('Cadastro vazio.');
  const chunks:Uint8Array[]=[];let length=0;
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>7_100_000){await reader.cancel();throw new Error('A foto deve ter até 5 MB.');}chunks.push(value);}
  return NextResponse.json(await savePlanProduct(JSON.parse(Buffer.concat(chunks).toString('utf8'))));
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Não foi possível salvar o produto.'},{status:400});}
}