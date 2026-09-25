import fs from 'node:fs/promises';
import {mock} from 'node:test';
import type {CatalogPolicy} from '../../src/services/catalog-policy';
export function fixtureCatalog(number:string):CatalogPolicy {
 const rows=[
 ['FN-01',number==='2'?'Blush lounge chair':'Cream armchair','Furniture','FN-02'],
 ['FN-02','Lounge chair, patterned cushion','Furniture','FN-02'],
 ['FN-03',number==='2'?'Blush lounge chair, mint cushion':'Armchair, mustard cushion','Furniture','FN-02'],
 ['FN-04',number==='2'?'Slim wood coffee table':'Wood coffee table','Furniture','FN-04'],
 ['FN-05','Shell dining chair','Furniture','FN-05'],['FN-06','Ribbed booth sofa','Furniture','FN-06'],
 ['FL-01','Wood floor','Flooring','WL-01'],['WL-01','Wall fabric','Wall','WL-01'],
 ['WL-02','Wall oak','Wall','WL-01'],['WL-03','Wall plaster','Wall','WL-01'],
 ['WL-04','Wall paint','Wall','WL-01'],['GL-01','Glass partition','Glazing','GL-01'],
 ['DR-01','Timber door','Door','DR-01'],['CL-01','Ceiling','Ceiling','WL-01'],
 ['LT-01','Linear light','Lighting','WL-01'],['CN-01','Reception desk','Joinery','CN-01'],
 ['RG-01',number==='3'?'Hexagon tile inlay':'Wool rug',number==='3'?'Flooring':'Rug','WL-01'],
 ['PL-01','Planter','Planting','WL-01'],
 ...(number==='3'?[['AR-01','Art print','Accessory','WL-01']]:[]),
 ];
 return {name:'Test-only catalog '+number,status:'ready',previewImage:'/plans/illustrative/FN-02.png',allowCompatibleFallback:true,rules:['Preserve existing architecture.'],products:rows.map(([id,name,category,image])=>({id,name,category,image:'/plans/illustrative/'+image+'.png',description:'Test reference for existing compatible elements.',approved:true,location:'Existing compatible room element'}))};
}
export function mockCatalogFiles(){
 const original=fs.readFile;
 return mock.method(fs,'readFile',async(...args:any[])=>{
  if(String(args[0]).replaceAll('\\','/').endsWith('/src/config/astra-catalog.json'))
   return JSON.stringify({moodboards:Object.fromEntries(['1','2','3'].map(n=>[n,fixtureCatalog(n)]))});
  return (original as any)(...args);
 });
}