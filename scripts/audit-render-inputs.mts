import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {getMoodboardContext} from '../src/services/moodboard-context';
import {loadCatalogPolicy} from '../src/services/catalog-policy';
import {generateRenders} from '../src/services/openai-render';
import {PROJECT_REFERENCE} from '../src/services/project-reference';
import dimensions from '../src/data/dimension-reference.json';
import ceiling from '../src/data/ceiling-reference.json';
const [local,active]=await Promise.all([getMoodboardContext('1'),loadCatalogPolicy('1')]);
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const documents=[PROJECT_REFERENCE.image,PROJECT_REFERENCE.ceilingImage,dimensions.sourceUrl,...dimensions.detailImages.map(d=>d.image)];
let captured:any=null,error:string|null=null;
const originalFetch=globalThis.fetch,originalKey=process.env.OPENAI_API_KEY;
try{
 process.env.OPENAI_API_KEY='audit-mock-key';
 globalThis.fetch=async(_url,init)=>{captured=JSON.parse(String(init?.body));throw Error('AUDIT_CAPTURE_COMPLETE');};
 await generateRenders({brief:{operation:'base',instructions:'Auditar referências sem envio externo.',selections:[],documents:[]},moodboardNumber:'1'});
}catch(e){if(!(e instanceof Error&&e.message==='AUDIT_CAPTURE_COMPLETE'))error=e instanceof Error?e.message:String(e);}
finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=originalKey;}
const content=captured?.input[0].content??[];
const sent=content.length?JSON.parse(content[0].text.split('\n').slice(1).join('\n')):null;
const imageHashes=new Set(content.filter((c:any)=>c.type==='input_image').map((c:any)=>hash(Buffer.from(c.image_url.split(',')[1],'base64'))));
const mandatoryImages=await Promise.all(documents.map(async url=>{try{const bytes=await readFile('public'+url);return {url,exists:true,sha256:hash(bytes),includedInRequest:imageHashes.has(hash(bytes))};}catch{return {url,exists:false,includedInRequest:false};}}));
const selections=await Promise.all((sent?.selections??[]).map(async(p:any)=>{const bytes=await readFile('public'+p.image);return {productId:p.assetId,image:p.image,includedInRequest:imageHashes.has(hash(bytes))};}));
const assignments=sent?.instanceReferences?.assignments??[];
const assignmentsExact=JSON.stringify(assignments)===JSON.stringify(local.assignments);
const compositionExact=JSON.stringify(sent?.compositionPlan)===JSON.stringify(local.compositionPlan);
const roomsExact=JSON.stringify(sent?.instanceReferences?.rooms)===JSON.stringify(local.rooms);
const allLinked=assignmentsExact&&compositionExact&&roomsExact&&!!sent&&mandatoryImages.every(i=>i.includedInRequest)&&assignments.length===local.assignments.length&&assignments.every((a:any)=>a.productId?selections.some((p:any)=>p.productId===a.productId&&p.includedInRequest):!!a.manualReferenceKey);
const audit={auditedAt:new Date().toISOString(),mode:'transport-captured-locally',actualExternalRequests:0,modelAccessAndBillingTested:false,allLinkedToRenderProvider:allLinked,exactArchitectureVerified:false,checks:{assignmentsExact,compositionExact,roomsExact},renderCatalog:{status:active.status,externalDelivery:active.externalDelivery,products:active.products.length},instances:{local:local.summary.instances,sent:assignments.length,unmatched:assignments.filter((a:any)=>!a.productId&&!a.manualReferenceKey).length,revision:local.sources.instanceRevision,areasRevision:local.sources.areaRevision,referenceRevision:local.revision},mandatoryImages,selections,error,fidelity:sent?.fidelity??null,dimensionConflicts:dimensions.constraints.filter(c=>c.includes('differ')||c.includes('overlaps')),missingCeilingDetails:ceiling.missingDetails};
await writeFile('referencias/AUDITORIA-API.json',JSON.stringify(audit,null,2));
await writeFile('referencias/AUDITORIA-API.md',[
 '# Auditoria da integração autorizada','', 'Data: '+audit.auditedAt,'',
 '**Conexão das referências ao pedido da API: '+(allLinked?'verificada':'incompleta')+'. Fidelidade arquitetônica exata: não validada.**','',
 '- Catálogo ativo: '+active.products.length+' produtos, envio '+active.externalDelivery+'.',
 '- Instâncias no pedido: '+assignments.length+'; sem vínculo: '+audit.instances.unmatched+'.',
 '- Imagens obrigatórias das plantas e medidas: '+mandatoryImages.filter(i=>i.includedInRequest).length+'/'+mandatoryImages.length+'.',
 '- Imagens de produtos compatíveis no pedido: '+selections.length+'. Produtos de outros ambientes não são incluídos quando há ambiente selecionado.',
 '- O envio inicial registra a direção visual e gera a imagem na mesma requisição.',
 '- Partes de sofá/bancada, contornos, rotações, acabamentos e origem acompanham os vínculos.',
 '- Cadastros manuais prevalecem. Referências incompatíveis ou instâncias sem vínculo interrompem a geração.',
 '- Referências e geometria desatualizadas invalidam o reaproveitamento automático de renders antigos.',
 '- Cada render registra as revisões e os hashes das imagens anexadas.','',
 '## Limites da verificação','',
 'Pedido capturado em transporte simulado. Nenhuma chamada externa nem cobrança. Acesso aos modelos, saldo e qualidade de imagem real não foram testados.',
 'Portas, janelas e entradas continuam como informação das imagens, sem cadastro geométrico validado por abertura. As regras de prompt não constituem uma garantia de posição exata. Não existe validação geométrica automática do render final.','',
 ...audit.dimensionConflicts.map(c=>'- '+c),'- '+ceiling.missingDetails,'',
 'A documentação oficial reconhece limites de posicionamento preciso: [OpenAI — Image generation](https://developers.openai.com/api/docs/guides/image-generation#limitations).',
 'Detalhes reproduzíveis em [AUDITORIA-API.json](AUDITORIA-API.json).',
].join('\n')+'\n');
console.log(JSON.stringify({allLinked,checks:audit.checks,products:active.products.length,instances:assignments.length,mandatoryImages:mandatoryImages.filter(i=>i.includedInRequest).length,productImages:selections.length,externalDelivery:active.externalDelivery,actualExternalRequests:0,error}));
if(!allLinked)process.exitCode=1;
