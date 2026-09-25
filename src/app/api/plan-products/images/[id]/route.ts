import {readPlanProductPhoto} from '../../../../../services/plan-product-catalog';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{return new Response(new Uint8Array(await readPlanProductPhoto((await params).id)),{headers:{'Content-Type':'image/png','Cache-Control':'private, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});}
 catch{return new Response('Foto não encontrada.',{status:404});}
}