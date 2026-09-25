import {NextResponse} from 'next/server';
import {getMoodboardContext} from '../../../services/moodboard-context';
export const runtime='nodejs';
export async function GET(request:Request){
 const url=new URL(request.url),number=url.searchParams.get('moodboard')??'1',roomId=url.searchParams.get('roomId')??undefined;
 if(!['1','2','3'].includes(number))return NextResponse.json({error:'Moodboard inválido.'},{status:400});
 try{return NextResponse.json(await getMoodboardContext(number as '1'|'2'|'3',roomId),{headers:{'Cache-Control':'no-store'}});}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Não foi possível carregar o catálogo.'},{status:400});}
}
