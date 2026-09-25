import {readFile} from 'node:fs/promises';
import path from 'node:path';
import type {CatalogPolicy,CatalogProduct} from './catalog-policy';
/** Local review only. Does not activate or modify the external render provider catalog. */
export async function loadLocalReferenceCatalog():Promise<CatalogPolicy>{
 const [pdf,additions]=await Promise.all(['moodboard-pdf.json','capture-products.json'].map(file=>readFile(path.join(process.cwd(),'src/config',file),'utf8').then(JSON.parse)));
 return {...pdf,name:additions.name,products:[...additions.products as CatalogProduct[],...pdf.products as CatalogProduct[]]};
}
