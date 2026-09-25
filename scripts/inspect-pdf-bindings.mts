import fs from 'node:fs';
import {getMoodboardContext} from '../src/services/moodboard-context';
const catalog=await getMoodboardContext('1');
const lines=['# Vínculos do moodboard com a planta','', 'Fonte: '+catalog.source?.fileName,'',
 'Revisão local: '+catalog.revision,'', '**Referências autorizadas e conectadas ao renderizador; fidelidade geométrica do resultado exige conferência.**','',
 JSON.stringify(catalog.summary),'',
 '| Ambiente | Instâncias | Referências vinculadas |','| --- | --- | --- |',
 ...catalog.rooms.map(room=>{const linked=catalog.assignments.filter(a=>a.roomId===room.id);return '| '+room.name+' | '+linked.length+' | '+[...new Set(linked.map(a=>a.productId??(a.manualReferenceKey?'Cadastro manual':'Proposta sem marca')))].join(', ')+' |';}),
 '', '## Instâncias','', '| Instância | Modelo da planta | Referência | Tratamento |','| --- | --- | --- | --- |',
 ...catalog.assignments.map(a=>'| '+[a.instanceCode,a.modelId||'Sem modelo',a.productId??a.manualReferenceKey??'Proposta sem marca',a.referenceMode].join(' | ')+' |'),
 '', '## Consulta local','', 'GET /api/moodboard-catalog?moodboard=1','', 'Filtro opcional: &roomId=PRISMAL_BOARDROOM','',
 'A resposta inclui produtos, imagens, medidas nominais de origem, ocorrências por página, referências sugeridas por instância, contornos normalizados e URLs das plantas baixa, de teto e de medidas. Os vínculos são recalculados a cada consulta a partir das edições salvas.',
 '', '## Regras de adaptação','',
 '- Cadastros manuais prevalecem sobre o PDF.',
 '- Quantidade, função, contorno e posição vêm da planta; quantidades comerciais não acrescentam móveis.',
 '- Tampos MES-01 são módulos, não bancadas completas de quatro ou oito lugares.',
 '- Bancos e mesas de booth usam apenas seu componente; a foto do conjunto não duplica assentos.',
 '- TBC e faixas de tecido geram proposta de acabamento identificada como tal.',
 '- Sem referência coerente, a proposta é um desenho sem marca dentro do contorno já criado.',
 '- Plantas de teto e medidas permanecem referências de geometria. Medidas nominais do catálogo não substituem cotas do projeto.',
 '- Nenhum preço, condição comercial ou termo contratual integra o contexto de geração preparado.',
];
fs.writeFileSync('referencias/VINCULOS-MOODBOARD.md',lines.join('\n')+'\n');
console.log(JSON.stringify({summary:catalog.summary,rooms:catalog.rooms.map(r=>({name:r.name,instances:r.instanceCount})),unmatched:catalog.assignments.filter(a=>!a.productId&&!a.manualReferenceKey).map(a=>({id:a.instanceCode,model:a.modelId,room:a.roomId})),sources:catalog.sources}));
