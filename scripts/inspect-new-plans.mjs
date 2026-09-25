import fs from 'node:fs';
import sharp from 'sharp';
import {createCanvas,DOMMatrix,ImageData,Path2D} from '@napi-rs/canvas';
Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
await sharp('src/PLANTAS/PLANTA BAIXA.svg').resize({width:1005}).png().toFile('public/plans/new-floor-inspect.png');
const name=fs.readdirSync('src/PLANTAS').find(n=>n.endsWith('.pdf'));
const pdf=await getDocument({data:new Uint8Array(fs.readFileSync('src/PLANTAS/'+name)),useSystemFonts:true}).promise;
const pages=[];
for(let n=1;n<=pdf.numPages;n++){const p=await pdf.getPage(n);const v=p.getViewport({scale:1.5});const c=createCanvas(Math.ceil(v.width),Math.ceil(v.height));await p.render({canvasContext:c.getContext('2d'),viewport:v,canvas:c}).promise;fs.writeFileSync('public/plans/ceiling-page-'+n+'.png',c.toBuffer('image/png'));const t=await p.getTextContent();pages.push({page:n,width:v.width,height:v.height,items:t.items.map(i=>({text:i.str,transform:i.transform}))});}
fs.writeFileSync('public/plans/ceiling-extracted.json',JSON.stringify({source:name,pages},null,2));console.log('Extracted '+pages.length+' ceiling page(s).');
