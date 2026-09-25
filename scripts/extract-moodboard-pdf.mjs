import fs from 'node:fs';
import {createCanvas,DOMMatrix,ImageData,Path2D} from '@napi-rs/canvas';
Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
const source='referencias/ITENS DE MOODBOARD.pdf';
const pdf=await getDocument({data:new Uint8Array(fs.readFileSync(source)),useSystemFonts:true}).promise;
const directory='referencias/moodboard-pdf-extracted';fs.mkdirSync(directory,{recursive:true});
const pages=[];
for(let n=1;n<=pdf.numPages;n++){
 const page=await pdf.getPage(n),base=page.getViewport({scale:1}),viewport=page.getViewport({scale:2});
 const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
 await page.render({canvasContext:canvas.getContext('2d'),viewport,canvas}).promise;
 fs.writeFileSync(directory+'/page-'+n+'.png',canvas.toBuffer('image/png'));
 const content=await page.getTextContent();
 const items=content.items.filter(i=>'str' in i).map(i=>({text:i.str,x:i.transform[4],y:base.height-i.transform[5],width:i.width,height:i.height}));
 pages.push({page:n,width:base.width,height:base.height,items});
 console.log(JSON.stringify({page:n,width:base.width,height:base.height,text:items.map(i=>i.text).join(' ')}));
}
fs.writeFileSync(directory+'/text.json',JSON.stringify({source,pages},null,2));
