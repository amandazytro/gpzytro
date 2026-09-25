import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
const source='referencias/ITENS DE MOODBOARD.pdf',out='public/catalog/moodboard-1-pdf';
fs.mkdirSync(out,{recursive:true});
const extracted=JSON.parse(fs.readFileSync('referencias/moodboard-pdf-extracted/text.json','utf8'));
const idsByPage=[
 ['SKELF-4000','CENTRA-USB','CENTRA-HDMI','STARTER'],
 ['INTERCONNECT','CABLE-SOCK','CREDENZA','BUTE','SKEF-1000','ROUND-POWER','STARTER','CABLE-SOCK'],
 ['BUTE','SKEF-1400','BLINKY','STARTER','CABLE-SOCK','CREDENZA','BUTE'],
 ['EXISTING-ROUND','EXISTING-CHAIR','AARAN','SINGLE-DESK'],
];
idsByPage[3]=['EXISTING-ROUND','ROUND-POWER','STARTER','CABLE-SOCK','EXISTING-CHAIR','AARAN','SINGLE-DESK'];
idsByPage.push(['DESK-POWER','CABLE-SOCK','MONITOR-ARM','LOLA','RICO','COFFEE-450']);
idsByPage.push(['SKELF-2400','HERMAN-DINING','PLATFORM','BEE-SEAT','BEE-TABLE','LOCH','HERMAN-DINING']);
idsByPage.push(['HERMAN-LOUNGE','MENDOZA','COFFEE-450','COFFEE-600','EXISTING-CHAIR']);
idsByPage.push(['PEDESTAL','HOT-DESK','CENTRA-USB','STARTER','INTERCONNECT','CABLE-SOCK','BENCH-4','SCREEN']);
idsByPage.push(['DESK-POWER','CABLE-SOCK','BENCH-8','SCREEN','AARAN','MONITOR-ARM','PLANTER-STORAGE']);
idsByPage.push(['COAT-CUPBOARD','TALL-STORAGE',null]);
const rows=[];
for(const page of extracted.pages.slice(0,10)){
 const anchors=page.items.filter(i=>i.x>=435&&i.x<450&&/^\d+$/.test(i.text.trim())&&i.y>85&&i.y<810);
 if(anchors.length!==idsByPage[page.page-1].length)throw Error('Unexpected PDF layout on page '+page.page);
 anchors.forEach((q,index)=>{
  const items=page.items.filter(i=>i.y>=q.y-3&&i.y<(anchors[index+1]?.y??810)-3);
  rows.push({productId:idsByPage[page.page-1][index]?'PDF-'+idsByPage[page.page-1][index]:null,page:page.page,row:index+1,sourceQuantity:Number(q.text),
   sourceDescription:items.filter(i=>i.x>=70&&i.x<359).map(i=>i.text).join(' ').replace(/\s+/g,' ').trim(),
   sourceFinish:items.filter(i=>i.x>=359&&i.x<430).map(i=>i.text).join(' ').replace(/\s+/g,' ').replace(/^Finish:\s*/,'').trim(),
   sourceLocation:items.filter(i=>i.x>=28&&i.x<69).map(i=>i.text).join(' ').replace(/\s+/g,' ').trim(),
   sourceOption:items.some(i=>i.text.trim().toLowerCase()==='option')});
 });
}
// Each entry identifies one source model or size variant. No prices or contractual terms enter the render catalog.
const definitions=[
 ['SKELF-4000','Mesa de conselho Skelf · 4.000 mm','Furniture','Mesa de conselho','meeting_table','p1-image-4.png',['BOARDROOM'],['MES-03'],'Tampo em carvalho claro e estrutura preta; proposta para o MFC sem acabamento definido.','Finish proposal; preserve the long boardroom table footprint.'],
 ['CENTRA-USB','Módulo de energia Centra · USB','Equipment','Energia das mesas','power','p1-image-5.png',['BOARDROOM','TEAM'],[],'Branco, conforme o PDF.','Only on existing compatible desk power positions.'],
 ['CENTRA-HDMI','Módulo de energia Centra · HDMI','Equipment','Energia de conferência','power','p1-image-6.png',['BOARDROOM'],[],'Branco, conforme o PDF.','Keep as an accessory, never an independent furniture instance.'],
 ['STARTER','Cabo de alimentação · 2 m','Equipment','Cabeamento','cable','p1-image-7.png',[],[],'Branco, conforme o PDF.','Preserve concealed routing; no visible new cable clutter.'],
 ['INTERCONNECT','Cabo de interligação · 2 m','Equipment','Interligação','cable','p2-image-4.png',[],[],'Branco, conforme o PDF.','Technical reference only; do not create furniture.'],
 ['CABLE-SOCK','Organizador de cabos','Equipment','Organização de cabos','cable',null,[],[],'Branco, conforme o PDF.','The PDF provides no image; shape is unspecified.'],
 ['CREDENZA','Armário baixo · 3 portas','Joinery','Armário baixo','storage','p2-image-5.png',['BOARDROOM','MEETING_1'],['SUP-02'],'Carvalho claro nas frentes e base preta; proposta para MFC TBC.','Preserve existing storage footprint; do not add quoted units absent from plan.'],
 ['BUTE','Cadeira de reunião Bute','Furniture','Cadeira de reunião','meeting_chair','p2-image-1.png',['BOARDROOM','HUDDLE_1','MEETING_1'],['CAD-03','CAD-04'],'Preto, conforme o PDF.','Use one chair per mapped seat; preserve orientation.'],
 ['SKEF-1000','Mesa circular Skef · Ø 1.000 mm','Furniture','Mesa de reunião pequena','meeting_table','p2-image-6.png',['HUDDLE_1'],['MES-04'],'Tampo carvalho claro e base carvalho natural; proposta para MFC TBC.','Nominal source diameter; the measured plan takes precedence.'],
 ['ROUND-POWER','Módulo circular de energia e USB','Equipment','Energia circular','power','p2-image-2.png',['HUDDLE_1','EXECUTIVE'],[],'Branco, conforme o PDF.','Use only an existing compatible tabletop accessory.'],
 ['SKEF-1400','Mesa circular Skef · Ø 1.400 mm','Furniture','Mesa de reunião grande','meeting_table','p3-image-1.png',['MEETING_1'],['MES-05'],'Tampo carvalho claro e base carvalho natural; proposta para MFC TBC.','Keep the larger meeting-table role, not the smaller table size.'],
 ['BLINKY','Módulo de energia Blinky','Equipment','Energia da mesa grande','power','p3-image-4.png',['MEETING_1'],[],'Branco, conforme o PDF.','Preserve existing equipment and connectors.'],
 ['EXISTING-ROUND','Mesa circular existente · escritório','Furniture','Mesa de apoio do escritório','meeting_table','p4-image-1.png',['EXECUTIVE'],['MES-09'],'Madeira e base metálica conforme a fotografia.','Do not import surrounding chairs, papers or room background from the source photo.'],
 ['EXISTING-CHAIR','Cadeira existente de reunião','Furniture','Cadeira existente','meeting_chair','p4-image-2.png',['EXECUTIVE','PHONE'],['POL-02'],'Preto e estrutura metálica, conforme a fotografia.','Only existing seats; never add the quoted quantity to the plan.'],
 ['AARAN','Cadeira de trabalho Aaran','Furniture','Cadeira de trabalho','office_chair','p9-image-3.png',['WORK_WEST','TEAM','EXECUTIVE'],['CAD-01','CAD-02','CAD-06'],'Preto, conforme o PDF.','Keep every existing workstation chair and all monitors and equipment.'],
 ['SINGLE-DESK','Mesa individual · 1.600 × 800 mm','Furniture','Mesa individual','desk','p4-image-4.png',['EXECUTIVE'],['MES-07'],'Tampo carvalho claro e estrutura preta; proposta para MFC TBC.','The photograph shows a bench system: use only one desk module, no extra chairs or monitors.'],
 ['DESK-POWER','Kit de energia sobre e sob a mesa','Equipment','Energia das estações','power','p9-image-5.png',['WORK_WEST','EXECUTIVE'],[],'Preto, conforme o PDF.','Accessory kit, not two new furniture instances.'],
 ['MONITOR-ARM','Braço de monitor Move','Equipment','Suporte de monitor','monitor_arm','p9-image-7.png',['WORK_WEST','EXECUTIVE'],[],'Preto; opção branca consta no PDF.','Retain actual existing monitor count, screen size and mounting points.'],
 ['LOLA','Poltrona Lola Lounge','Furniture','Poltrona de espera','armchair','p5-image-1.png',['WAITING'],['POL-01'],'Tecido creme e base preta; cor proposta, faixa Band 3 não define cor.','Default for the angular waiting seats; maintain their existing rotated footprint.'],
 ['RICO','Poltrona Rico Lounge','Furniture','Poltrona de espera','armchair','p5-image-6.png',['WAITING'],['POL-01'],'Bouclé off-white, conforme o PDF.','Alternative to Lola, not additional seating. Allow silhouette adaptation only within existing seat bounds.'],
 ['COFFEE-450','Mesa de apoio · Ø 450 mm','Furniture','Mesa de apoio pequena','coffee_table','p5-image-2.png',['WAITING','LOUNGE'],['MES-08'],'Tampo carvalho e base preta conforme texto do PDF; a fotografia mostra base branca.','Written finish overrides photo. Height 425 mm: this is a low table.'],
 ['SKELF-2400','Mesa da copa Skelf · 2.400 mm','Furniture','Mesa da copa','dining_table','p6-image-2.png',['LOUNGE'],['MES-06'],'Tampo carvalho claro e estrutura preta; proposta para MFC TBC.','Retain the existing dining table and its six mapped chairs.'],
 ['HERMAN-DINING','Cadeira de jantar Herman','Furniture','Cadeira da copa','dining_chair','p6-image-4.png',['LOUNGE'],['CAD-05'],'Carvalho natural, conforme o PDF.','Default for mapped dining chairs. Repeated source rows describe the same model.'],
 ['PLATFORM','Cadeira Platform','Furniture','Cadeira da copa','dining_chair','p6-image-3.png',['LOUNGE'],['CAD-05'],'Assento e encosto em freixo natural, estrutura preta.','Alternative to Herman, not additional seating.'],
 ['BEE-SEAT','Banco estofado Bee Fluted','Furniture','Banco de booth','booth_seat','p6-image-6.png',['LOUNGE'],['BAN-01'],'Estofado cinza médio e base preta; cor proposta para Band 2.','Source photograph contains a complete booth and plants. Use ONLY the bench component: four existing benches, no added planters.'],
 ['BEE-TABLE','Mesa e laterais Bee','Furniture','Mesa de booth','booth_table','p6-image-5.png',['LOUNGE'],['MES-10'],'Tampo carvalho claro e laterais cinza médio; proposta para MFC e Band 2.','2100 × 1500 mm describes the assembly. Do not force assembly dimensions onto each tabletop or duplicate seating.'],
 ['LOCH','Conjunto de booth Loch · 4 lugares','Furniture','Alternativa de booth','booth_system','p6-image-1.png',['LOUNGE'],['BAN-01','MES-10'],'Tampo carvalho, base preta e estofado cinza médio proposto para TBC.','Alternative system: replace only the appearance of existing benches and tables, one component per mapped instance.'],
 ['HERMAN-LOUNGE','Poltrona Herman Lounge','Furniture','Poltrona de convivência','armchair','p7-image-4.png',['LOUNGE'],['POL-02'],'Bouclé de lã claro e base em carvalho natural.','Only if a lounge seat is already mapped; do not insert seats to match source quantity.'],
 ['MENDOZA','Poltrona Mendoza','Furniture','Poltrona de convivência','armchair','p7-image-2.png',['LOUNGE'],['POL-02'],'Tecido creme e estrutura preta; cor proposta para Band 3.','Alternative to Herman Lounge, not additional seating.'],
 ['COFFEE-600','Mesa baixa de convivência · Ø 600 mm','Furniture','Mesa de apoio grande','coffee_table','p7-image-5.png',['LOUNGE'],['MES-08'],'Tampo carvalho e base preta, conforme texto do PDF.','Source calls it Dining table but states H425 mm; normalize as LOW table, not a dining or work table.'],
 ['PEDESTAL','Gaveteiro Note · 3 gavetas','Joinery','Gaveteiro','storage','p8-image-3.png',['WORK_WEST','EXECUTIVE'],[],'Preto, conforme o PDF.','25 quoted units are source information, not authority to add visible units absent from plan.'],
 ['HOT-DESK','Mesa colaborativa · 6 postos','Furniture','Mesa colaborativa','desk','p8-image-4.png',['TEAM'],['MES-02'],'Tampo carvalho claro e estrutura preta; proposta para MFC TBC.','One mapped shared table system, six existing chairs. Keep central equipment and layout.'],
 ['BENCH-4','Estação compartilhada · 4 postos','Furniture','Tampo de trabalho','desk','p8-image-1.png',['WORK_WEST'],['MES-01'],'Tampo carvalho claro e estrutura preta; proposta para MFC TBC.','Use one 1400 × 800 mm worktop module per mapped MES-01 instance. Never add an entire 4-person bench at each instance.'],
 ['SCREEN','Painel acústico de mesa','Accessory','Painel de mesa','desk_screen','p8-image-2.png',['WORK_WEST'],[],'Cinza médio conforme imagem; Band A é faixa de tecido, não cor.','Apply only at existing desk screen locations; preserve monitors and sightlines.'],
 ['BENCH-8','Estação compartilhada · 8 postos','Furniture','Tampo de trabalho','desk','p9-image-1.png',['WORK_WEST'],['MES-01'],'Tampo carvalho claro e estrutura preta; proposta para MFC TBC.','Source photo repeats the bench illustration. Use one worktop module per mapped instance; grouping/count always follows plan.'],
 ['PLANTER-STORAGE','Armário baixo com floreira','Joinery','Armário com floreira','storage','p9-image-6.png',['WORK_WEST','TEAM'],['SUP-02'],'Armário cinza grafite e floreira preta; proposta para MFC TBC.','Plants and liners are excluded in the quote. Preserve only planting already shown in plan.'],
 ['COAT-CUPBOARD','Armário de apoio · 1.800 mm','Joinery','Armário de entrada','storage','p10-image-1.png',['RECEPTION'],['SUP-02'],'Carvalho claro com detalhes pretos; proposta para MFC TBC.','Diagram only; do not infer hidden construction details. Only where existing storage is mapped.'],
 ['TALL-STORAGE','Armário alto · escritório','Joinery','Armário alto','storage','p10-image-2.png',['WORK_WEST','TEAM'],['SUP-02'],'Carvalho claro com detalhes pretos; proposta para MFC TBC.','Same source sketch as coat cupboard but distinct 450 mm depth. Keep the size variants separate.'],
];
const parseDimensions=text=>{
 const result={};const w=text.match(/W(\d+)mm/i),d=text.match(/D(\d+)mm/i),h=text.match(/H(\d+)mm/i);
 if(w)result.widthMm=+w[1];if(d)result[w?'depthMm':'diameterMm']=+d[1];if(h)result.heightMm=+h[1];return result;
};
const missing=Buffer.from('<svg width="640" height="640"><rect width="640" height="640" fill="#f4f4f0"/><text x="320" y="305" text-anchor="middle" font-family="sans-serif" font-size="25" fill="#777">Sem imagem no PDF</text><text x="320" y="345" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#999">Referência técnica textual</text></svg>');
await sharp(missing).png().toFile(out+'/no-image.png');
const products=[];
for(const [key,name,category,group,role,image,roomKeys,planModelIds,standardizedFinish,adaptationNotes] of definitions){
 const id='PDF-'+key,occurrences=rows.filter(r=>r.productId===id),file=key.toLowerCase()+'.png';
 if(!occurrences.length)throw Error('Missing source '+id);
 if(image)await sharp('referencias/moodboard-pdf-extracted/images/'+image).flatten({background:'white'}).resize(576,576,{fit:'inside',withoutEnlargement:true}).resize(640,640,{fit:'contain',background:'white',withoutEnlargement:true}).png().toFile(out+'/'+file);
 const sourceDimensions=parseDimensions(occurrences[0].sourceDescription);
 products.push({id,name,category,group,role,image:'/catalog/moodboard-1-pdf/'+(image?file:'no-image.png'),imageRole:image?'source_product':'missing',approved:true,sourceKind:'pdf',sourceModel:occurrences[0].sourceDescription.split(/ W\d| D\d| Adjustable| Seat weight/)[0],manufacturer:'Não informado no PDF',supplier:'Cirque Furniture — fornecedor indicado no documento',roomIds:roomKeys.map(k=>'PRISMAL_'+k),planModelIds,sourceDimensions,sourceQuantity:occurrences.reduce((n,r)=>n+r.sourceQuantity,0),sourceOccurrences:occurrences,standardizedFinish,finish:standardizedFinish,finishStatus:/proposta|proposto/i.test(standardizedFinish)?'proposed':'source',adaptationNotes,description:standardizedFinish+' '+adaptationNotes,location:roomKeys.join(', ')||'Acessório de elementos existentes'});
}
const sha256=crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
fs.copyFileSync(source,out+'/source.pdf');
const palette={wood:'Carvalho natural claro',metal:'Preto fosco',upholstery:'Creme/off-white e cinza médio',policy:'Proposta de padronização baseada nos materiais presentes no PDF. Aplicar somente aos acabamentos sem definição; acabamentos explícitos e cadastros do usuário prevalecem.'};
const sourceDocument={fileName:path.basename(source),url:'/catalog/moodboard-1-pdf/source.pdf',sha256,pageCount:extracted.pages.length,productPages:[1,2,3,4,5,6,7,8,9,10],ignoredMarks:'X verdes ignorados por orientação do usuário.',excluded:'Custos, serviços de armazenagem, condições comerciais e contratuais não fazem parte do catálogo visual.'};
const policy={status:'ready',name:'Carvalho, preto e bouclé · PDF do projeto',previewImage:'/catalog/moodboard-1-pdf/overview.png',sourceDocument,allowCompatibleFallback:true,allowProductAdaptation:true,palette,products,rules:[
 'A planta baixa, seus contornos editados e as instâncias atuais definem posição, função, quantidade e orientação dos móveis.',
 'A planta de teto e a planta cotada são obrigatórias; suas geometrias e cotas prevalecem sobre dimensões nominais do catálogo.',
 'Não aplicar quantidades comerciais à planta. Alternativas substituem referências, nunca acrescentam instâncias.',
 'Acabamentos TBC, Band 2, Band 3 e Band A não são cores confirmadas. As escolhas nesses campos são propostas de projeto.',
 'Permissão do usuário: adaptar ou criar um modelo coerente quando a referência não couber na função ou no contorno existente; identificar isso como proposta sem fabricante.',
 'Cadastros manuais específicos do usuário prevalecem sobre os padrões deste catálogo.',
 'Fotografias de conjuntos orientam somente o componente vinculado. Não copiar mobiliário, plantas ou equipamentos adicionais da foto.',
 'O texto explícito do acabamento prevalece sobre a foto quando divergir, como nas bases pretas das mesas de apoio.',
 'Itens sem instância compatível permanecem disponíveis no catálogo, sem inclusão automática na planta.',
]};
fs.writeFileSync('src/config/moodboard-pdf.json',JSON.stringify({...policy,externalDelivery:'pending_approval'},null,2));
fs.writeFileSync('referencias/moodboard-pdf-extracted/catalog-rows.json',JSON.stringify(rows,null,2));
const chosen=['AARAN','BUTE','SKELF-4000','SKEF-1000','LOLA','HERMAN-DINING','BEE-SEAT','HOT-DESK','BENCH-4','HERMAN-LOUNGE','COFFEE-450','PLANTER-STORAGE'];
const composites=[];
for(let i=0;i<chosen.length;i++){
 const p=products.find(p=>p.id==='PDF-'+chosen[i]),left=(i%4)*300,top=Math.floor(i/4)*330;
 composites.push({input:await sharp('public'+p.image).resize(280,280,{fit:'contain',background:'white'}).png().toBuffer(),left:left+10,top});
 const label=p.name.replaceAll('&','&amp;').replaceAll('<','&lt;');
 composites.push({input:Buffer.from('<svg width="300" height="45"><text x="150" y="23" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#333">'+label+'</text></svg>'),left,top:top+280});
}
await sharp({create:{width:1200,height:990,channels:3,background:'white'}}).composite(composites).png().toFile(out+'/overview.png');
const report=['# Catálogo do PDF — padronização','', 'Fonte: ITENS DE MOODBOARD.pdf · '+extracted.pages.length+' páginas · SHA-256 '+sha256,'',
 products.length+' referências únicas consolidadas de '+rows.filter(r=>r.productId).length+' linhas. Quantidades de origem são documentais, não quantidades a inserir na planta. X verdes ignorados conforme solicitado.','',
 'Paleta proposta: carvalho claro, preto fosco, creme/off-white e cinza médio. As propostas não representam acabamento de fabricante confirmado.','',
 '| ID | Referência | Páginas | Qtd. no PDF | Acabamento |','| --- | --- | --- | --- | --- |',
 ...products.map(p=>'| '+[p.id,p.name,[...new Set(p.sourceOccurrences.map(r=>r.page))].join(', '),p.sourceQuantity,p.standardizedFinish].join(' | ')+' |'),'',
 'Notas de compatibilidade:','',
 ...products.map(p=>'- **'+p.id+'**: '+p.adaptationNotes),'',
 'Medidas nominais de sistemas Bee e bancadas coletivas não são medidas de cada instância. Instâncias de tampos usam apenas um módulo. A mesa “Dining” de Ø600 × H425 mm foi classificada como mesa baixa. As cadeiras Bute e Aaran repetidas foram unificadas, mantendo suas ocorrências por página.'];
fs.writeFileSync('referencias/CATALOGO-PDF-PADRONIZADO.md',report.join('\n')+'\n');
console.log(JSON.stringify({products:products.length,sourceRows:rows.filter(r=>r.productId).length,sourcePages:extracted.pages.length,sha256}));
