import {productGroup} from './product-options';
import {resolveCatalogProducts,type CatalogPolicy,type CatalogProduct} from './catalog-policy';
export {COMPOSITION_REVISION} from './product-options';
export interface CompositionItem {element:string;change:string;productId:string|null;finishReferenceIds:string[];referenceMode:'exact_product'|'specified_finishes'|'original_design';allowOriginalDesign:boolean;allowNewFinishes:boolean;reference:string}
export interface CompositionPlan {rule:string;items:CompositionItem[];productIds?:string[]}
export function compositionPlan(roomId:string|undefined,policy:CatalogPolicy,choices:string[]=[]):CompositionPlan{
 const selected=resolveCatalogProducts(policy,choices);
 const groups=choices.length?selected.map(productGroup):[];
 if(new Set(groups).size!==groups.length)throw new Error('Escolha apenas uma opção por categoria.');
 const products=choices.length?[...selected,...policy.products.filter(p=>p.approved&&!groups.includes(productGroup(p)))]:selected;
 const find=(pattern:RegExp)=>products.find(p=>pattern.test(p.name));
 const finishes=products.filter(p=>['Wall','Joinery','Flooring','Ceiling','Door','Glazing','Lighting'].includes(p.category));
 const specs:[string,CatalogProduct|undefined,string][]=[
  ['sofa',products.find(p=>/sofa/i.test(p.name)&&!/booth/i.test(p.name)),'Never use workspace booth seating as a lounge sofa.'],
  ['armchair',find(/armchair|lounge chair/i),'Keep existing chair count. Other provided cushion variants may be used only when no explicit choice was made.'],
  ['coffee table',find(/coffee table/i),'Apply only to existing coffee tables, never to a large work or meeting table.'],
  ['main table',undefined,'A large table stays a large table. Keep its outline, size and function; use applicable specified finishes, never shrink it to the coffee-table reference.'],
  ['rug',products.find(p=>p.category==='Rug'),'A hard tile inlay is not a textile rug. Never turn an existing rug into a tiled architectural feature.'],
  ['artwork',find(/art print|artwork/i),'Apply only where artwork already exists.'],
  ['plant and planter',products.find(p=>p.category==='Planting'),'Keep existing plant count, species, footprint and locations; use the applicable planter finish. Never add the pictured planting cluster.'],
  ['reception desk',find(/reception desk/i),'Only in an existing reception desk location. Preserve original footprint and shape; apply the specified finishes without relocating or reshaping the desk.'],
  ['workspace booth',find(/booth/i),'Only where a workspace booth already exists. Never place a booth in the lounge.'],
  ['dining chair',find(/dining chair/i),'Only on existing meeting or dining chairs. Preserve equipment and table arrangement.'],
 ];
 const items:CompositionItem[]=specs.map(([element,product,note])=>({element,
  change:(product?'Use '+product.id+' '+product.name+' exactly as referenced. '+product.description:'For an existing '+element+' without a specified model, design its form using applicable finishes and colours of this moodboard only.')+' '+note+' Skip this item when absent in the original room; never add it. Preserve position, count, orientation and scale.',
  productId:product?.id??null,finishReferenceIds:product?[]:finishes.map(p=>p.id),referenceMode:product?'exact_product':finishes.length?'specified_finishes':'original_design',allowOriginalDesign:!product,allowNewFinishes:!product&&!finishes.length,reference:product?.name??'Applicable finishes from the selected moodboard'
 }));
 for(const p of finishes)items.push({element:p.name,change:'Apply '+p.id+' only to the existing compatible surface at '+(p.location??'the specified location')+'. '+p.description+' Preserve all geometry. Do not create niches, doors, curves, partitions, ceiling drops or floor inlays. For an inlay apply only if an equivalent floor surface exists; never treat it as a rug.',productId:p.id,finishReferenceIds:[],referenceMode:'exact_product',allowOriginalDesign:false,allowNewFinishes:false,reference:p.name});
 return {rule:'Restyle EVERY applicable existing element for '+(roomId??'the target room')+'. Reference location and function are mandatory. References are not a shopping list: never add absent objects. Preserve architecture, furniture placement and essential equipment. Never borrow materials from another moodboard.',items,productIds:products.map(p=>p.id)};
}
