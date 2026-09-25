import referenceModels from './reference-plan-models.json';
import {prismalRooms} from './prismal-rooms';
import {PLAN_WIDTH,PLAN_HEIGHT,projectPlans} from './project-plans';

export type PlanKind='chair'|'table'|'sofa'|'armchair'|'counter'|'wall'|'glass'|'door';
export type PlanBounds={x:number;y:number;width:number;height:number};
export type PlanModel={
 id:string;name:string;kind:PlanKind;category:string;image:string;finish:string;
 confidence:'alta'|'média'|'baixa';reason:string;comparison:'shape'|'surface-type';
};
export type PlanProduct=PlanBounds & {
 id:string;instanceCode:string;modelId:string;name:string;manufacturer:string;image:string;
 finish:string;category:string;rotationDeg:number;roomId:string|null;parts?:PlanBounds[];
};
const definitions: [string,string,PlanKind,string,string,PlanModel['confidence'],string][]=[
 ['CAD-01','Cadeira de trabalho','chair','FN-05','Mobiliário','alta','Mesmo encosto com braços, repetido nas três fileiras; considerar as versões giradas como o mesmo desenho.'],
 ['CAD-02','Cadeira da mesa colaborativa','chair','FN-05','Mobiliário','média','Seis silhuetas laterais semelhantes. O PNG não permite confirmar se também são do modelo CAD-01.'],
 ['CAD-03','Cadeira de conselho','chair','FN-05','Mobiliário','alta','Contorno externo arredondado com duplo traço, repetido nas laterais e na cabeceira.'],
 ['CAD-04','Cadeira das mesas redondas','chair','FN-05','Mobiliário','média','Assentos com braços e encosto curvo repetidos em diferentes rotações nas duas salas.'],
 ['CAD-05','Cadeira da copa','chair','FN-05','Mobiliário','média','Encosto arredondado e assento compacto; as duas cadeiras laterais parecem versões giradas.'],
 ['CAD-06','Cadeira do escritório','chair','FN-05','Mobiliário','baixa','Ocorrência isolada; mantida separada até confirmar a semelhança com as cadeiras de trabalho.'],
 ['MES-01','Tampo de trabalho retangular','table','FN-04','Mobiliário','alta','Cada metade separada pela linha central foi contada como um tampo. Confirmar se o produto final é uma mesa dupla.'],
 ['MES-02','Mesa colaborativa longitudinal','table','FN-04','Mobiliário','média','Conjunto comprido e estreito com divisão central; contado como uma unidade provisória.'],
 ['MES-03','Mesa de conselho','table','FN-04','Mobiliário','alta','Mesa comprida com cantos arredondados, distinta da mesa colaborativa.'],
 ['MES-04','Mesa redonda pequena','table','FN-04','Mobiliário','alta','Mesa circular menor, cercada por quatro cadeiras.'],
 ['MES-05','Mesa redonda de reunião','table','FN-04','Mobiliário','alta','Mesa circular maior, cercada por seis cadeiras; não agrupada com a menor.'],
 ['MES-06','Mesa retangular da copa','table','FN-04','Mobiliário','alta','Tampo retangular horizontal, diferente das mesas de trabalho.'],
 ['MES-07','Mesa do escritório','table','FN-04','Mobiliário','média','Tampo de trabalho isolado com proporção diferente dos postos abertos.'],
 ['MES-08','Apoio circular pequeno','table','FN-04','Mobiliário','baixa','Pequenos círculos com dimensões próximas. A função de mesa ou banco precisa ser confirmada.'],
 ['MES-09','Mesa de apoio do escritório','table','FN-04','Mobiliário','média','Círculo maior, mantido separado dos pequenos apoios.'],
 ['MES-10','Mesa de booth','table','FN-04','Mobiliário','alta','Dois tampos verticais iguais com cantos arredondados, entre bancos opostos.'],
 ['POL-01','Poltrona angular de espera','armchair','FN-02','Mobiliário','alta','Duas silhuetas angulares com braços e linhas diagonais, espelhadas.'],
 ['POL-02','Poltrona compacta arredondada','armchair','FN-02','Mobiliário','média','Quatro assentos compactos semelhantes no escritório e na convivência; agrupamento provisório.'],
 ['BAN-01','Banco estofado de booth','sofa','FN-06','Mobiliário','alta','Quatro bancos verticais semelhantes, dois em cada conjunto de booth.'],
 ['SOF-01','Sofá em L','sofa','FN-06','Mobiliário','média','Os dois trechos conectados são tratados como uma única instância, sem duplicar a contagem.'],
 ['SUP-01','Bancada da copa','counter','CN-01','Superfície','média','Os dois trechos em L formam uma única bancada; confirmar a divisão construtiva.'],
 ['SUP-02','Armário baixo','counter','CN-01','Superfície','baixa','Frentes modulares semelhantes em duas orientações; quantidade de módulos não inferida.'],
 ['PAR-01','Parede','wall','WL-01','Revestimento','baixa','Agrupamento por tipo de superfície; não indica paredes ou acabamentos idênticos.'],
 ['VID-01','Divisória transparente','glass','GL-01','Divisória','baixa','Traços finos tratados provisoriamente como divisórias; material e segmentação a confirmar.'],
 ['POR-01','Porta de giro','door','DR-01','Esquadria','média','Aberturas com arco de giro; agrupamento por tipo, sem afirmar mesma largura ou produto.'],
];
export const planModels:readonly PlanModel[]=[...(referenceModels as PlanModel[]),...definitions.map<PlanModel>(([id,name,kind,image,category,confidence,reason])=>({
 id,name,kind,image:'/plans/illustrative/'+image+'.png',category,confidence,reason,
 finish:'A definir · referência ilustrativa',
 comparison:['wall','glass','door','counter'].includes(kind)?'surface-type':'shape',
}))];
const models=new Map(planModels.map(m=>[m.id,m]));
const products:PlanProduct[]=[];
const counts=new Map<string,number>();
function contains(points:number[][],x:number,y:number){
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const [xi,yi]=points[i],[xj,yj]=points[j];
  if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
 }
 return inside;
}
function add(modelId:string,x:number,y:number,width:number,height:number,rotationDeg=0,parts?:PlanBounds[]){
 const model=models.get(modelId);if(!model)throw new Error('Unknown model '+modelId);
 const ordinal=(counts.get(modelId)??0)+1;counts.set(modelId,ordinal);
 const room=prismalRooms.find(r=>contains(r.polygon,x+width/2,y+height/2));
 products.push({id:model.kind+'-'+modelId.toLowerCase()+'-'+String(ordinal).padStart(3,'0'),instanceCode:modelId+'.'+String(ordinal).padStart(3,'0'),modelId,name:model.name,category:model.category,image:model.image,manufacturer:'A definir · identificação visual',finish:model.finish,x,y,width,height,rotationDeg,roomId:room?'PRISMAL_'+room.key:null,...(parts?{parts}:{})});
}
// A pair of facing worktops is two visible tops, not a verified pair of independent products.
for(const y of [79,192,306])for(const x of [77,128,194,246]){
 add('MES-01',x,y,46,25);add('MES-01',x,y+26,46,25,180);
 add('CAD-01',x+11,y-16,23,15,180);add('CAD-01',x+11,y+52,23,15);
}
add('MES-02',253,449,49,100,90);
for(const y of [454,485,517]){add('CAD-02',238,y,16,22,90);add('CAD-02',301,y,16,22,270);}
add('MES-03',701,66,49,129,90);
for(const y of [67,92,118,143,169]){add('CAD-03',688,y,14,23,90);add('CAD-03',751,y,19,23,270);}
add('CAD-03',715,195,23,16);
add('MES-04',736,271,32,32);
for(const [x,y,angle] of [[726,263,135],[754,263,225],[726,292,45],[754,292,315]])add('CAD-04',x,y,23,22,angle);
add('MES-05',710,369,50,51);
for(const [x,y,angle] of [[724,353,180],[756,366,240],[756,403,300],[724,421,0],[694,403,60],[694,366,120]])add('CAD-04',x,y,23,22,angle);
add('MES-06',401,409,83,30);
for(const x of [412,435,459]){add('CAD-05',x,394,20,14,180);add('CAD-05',x,440,20,14);}
for(const y of [397,435])add('CAD-05',374,y,20,19,90);
add('MES-07',741,456,29,40,90);add('CAD-06',772,466,19,24,270);
add('MES-09',683,527,25,24);
for(const [x,y,angle] of [[666,510,135],[706,511,225],[515,503,135],[549,481,225]])add('POL-02',x,y,24,22,angle);
add('POL-01',412,309,25,29,135);add('POL-01',470,310,25,29,225);
for(const [x,y,w,h] of [[443,303,19,17],[527,525,17,15],[561,497,18,20],[365,418,16,16]])add('MES-08',x,y,w,h);
for(const x of [364,442])add('MES-10',x,496,28,47,90);
for(const x of [340,393,418,471])add('BAN-01',x,496,24,49,90);
add('SOF-01',511,497,92,58,0,[{x:511,y:538,width:91,height:17},{x:583,y:497,width:20,height:41}]);
add('SUP-01',496,348,104,102,0,[{x:496,y:348,width:104,height:23},{x:577,y:371,width:23,height:79}]);
add('SUP-02',73,23,103,16);add('SUP-02',199,450,20,98,90);
for(const [x,y,w,h] of [[57,12,766,12],[57,30,11,385],[814,25,13,531],[193,550,621,14],[333,28,11,224],[346,129,120,9],[350,141,9,59],[360,194,55,8],[411,176,9,72],[463,142,10,110],[344,248,289,10],[631,27,9,210],[539,72,90,10],[539,76,11,169],[550,151,74,10],[550,219,79,10],[633,445,108,9],[60,442,70,10],[171,452,10,96]])add('PAR-01',x,y,w,h,w<h?90:0);
for(const [x,y,w,h] of [[685,277,7,55],[695,238,117,6],[664,344,148,8],[603,349,6,202],[493,334,108,7],[743,446,4,50]])add('VID-01',x,y,w,h,w<h?90:0);
for(const [x,y,w,h] of [[635,205,40,37],[689,247,32,31],[660,350,34,34],[659,450,31,32],[142,413,35,34],[497,217,41,37],[501,31,34,38],[364,304,40,40],[417,161,33,35]])add('POR-01',x,y,w,h);
export const planProducts:readonly PlanProduct[]=products;
export const planModelGroups=planModels.map(model=>({...model,instances:planProducts.filter(p=>p.modelId===model.id)}));
/** Coordinates describe the source PNG, never physical measurements. Mock finishes are deliberately excluded. */
export function planInstanceManifest(instances:readonly PlanProduct[]=planProducts){
 const normalize=(p:PlanBounds)=>({x:p.x/PLAN_WIDTH,y:p.y/PLAN_HEIGHT,width:p.width/PLAN_WIDTH,height:p.height/PLAN_HEIGHT});
 return {source:projectPlans.floor.display,status:'visual-inference-unverified',coordinateSystem:'normalized-image-bounds',rule:'Provisional grouping by visible shape, including rotated copies. Preserve each occurrence and its footprint. Counts refer to visible symbols, not verified product quantities. Do not infer real dimensions, manufacturers or finishes from this inventory.',models:planModels.filter(m=>instances.some(p=>p.modelId===m.id)).map(m=>({id:m.id,name:m.name,confidence:m.confidence,comparison:m.comparison,reason:m.reason,count:instances.filter(p=>p.modelId===m.id).length})),instances:instances.map(p=>({id:p.instanceCode,modelId:p.modelId,roomId:p.roomId,bounds:normalize(p),rotationDeg:p.rotationDeg,...(p.parts?{parts:p.parts.map(normalize)}:{})}))};
}