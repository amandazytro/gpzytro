import type {CatalogProduct} from '../services/catalog-policy';
import type {PlanProduct} from '../data/plan-products';
export function referenceForInstance(products:readonly CatalogProduct[],instance:PlanProduct){
 return products.find(p=>p.approved&&p.planModelIds?.includes(instance.modelId)&&(!p.roomIds?.length||!!instance.roomId&&p.roomIds.includes(instance.roomId)));
}
export function referenceOrigin(p:CatalogProduct){
 return p.sourceKind==='original'?'CRIAÇÃO FICTÍCIA':p.sourceKind==='capture'?'REFERÊNCIA DA CAPTURA':'REFERÊNCIA DO PDF';
}
export function referenceProvenance(p:CatalogProduct){
 return p.sourceKind==='original'?'Desenho original criado do zero; sem fabricante real.':p.sourceCapture?'Origem: '+p.sourceCapture.fileName:'Origem: PDF, página(s) '+[...new Set(p.sourceOccurrences?.map(r=>r.page))].join(', ')+'.';
}
