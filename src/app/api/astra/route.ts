import { readProjectState, saveProjectDirection } from '../../../services/project-state';
import { validateAstraInput } from '../../../services/astra-images';
import { NextResponse } from 'next/server';
import { astraStatus, createAstraImage } from '../../../services/astra-images';
import { RenderError } from '../../../services/openai-render';
import { planProjectBatch } from '../../../services/project-batch';
import { saveRoomComposition } from '../../../services/project-state';
export const runtime='nodejs';
export const maxDuration=300;
let active=false;
export async function GET(){
  try{return NextResponse.json({...await astraStatus(),direction:(await readProjectState()).direction??null},{headers:{'Cache-Control':'no-store'}});}
  catch{return NextResponse.json({error:'Não foi possível carregar a configuração da GPZytro.'},{status:503});}
}
export async function POST(request:Request){
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin&&origin!==new URL(request.url).protocol+'//'+request.headers.get('host'))return NextResponse.json({error:'Origem não permitida.'},{status:403});
  if(active)return NextResponse.json({error:'A GPZytro já está criando uma imagem. Aguarde a conclusão.'},{status:429});
  active=true;
  try{
    const reader=request.body?.getReader();
    if(!reader)throw new RenderError('Envie um prompt.');
    const chunks:Uint8Array[]=[];let bytes=0;
    while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>17_000_000){await reader.cancel();throw new RenderError('As referências excedem o limite de tamanho.',413);}chunks.push(value);}
    let body:unknown;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new RenderError('Pedido inválido.');}
    if((body as {scope?:unknown})?.scope==='project'){
      const input=validateAstraInput(body);
      const batch=await planProjectBatch();
      const state=await saveProjectDirection(input.prompt,input.references??[]);
      return NextResponse.json({direction:state.direction,batch});
    }
    if((body as {scope?:unknown})?.scope!==undefined&&(body as {scope?:unknown}).scope!=='image')throw new RenderError('Escopo inválido.');
    const input=validateAstraInput(body);
    const image=await createAstraImage(input,request.signal);
    if(input.saveComposition&&input.roomId)await saveRoomComposition({roomId:input.roomId,moodboardNumber:input.moodboardNumber??'1',imageId:image.id});
    return NextResponse.json({image});
  }catch(error){
    const known=error instanceof RenderError;
    return NextResponse.json({error:known?error.message:'Não foi possível concluir a imagem. Tente novamente.'},{status:known?error.status:502});
  }finally{active=false;}
}