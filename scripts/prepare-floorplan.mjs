import fs from "node:fs";
import path from "node:path";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
const {getDocument}=await import("pdfjs-dist/legacy/build/pdf.mjs");
const source="Layout Base - testes Prismal V2.pdf";
const pdf=await getDocument({data:new Uint8Array(fs.readFileSync(source)),useSystemFonts:true}).promise;
console.log("Pages:",pdf.numPages);
fs.mkdirSync("public/plans",{recursive:true});
for(let i=1;i<=pdf.numPages;i++){
 const page=await pdf.getPage(i),viewport=page.getViewport({scale:1.8}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
 await page.render({canvasContext:canvas.getContext("2d"),viewport,canvas}).promise;
 fs.writeFileSync("public/plans/source-"+i+".png",canvas.toBuffer("image/png"));
 if(i===1){
  const landscape=page.getViewport({scale:1.8,rotation:viewport.width<viewport.height?90:0});
  const wide=createCanvas(Math.ceil(landscape.width),Math.ceil(landscape.height));
  await page.render({canvasContext:wide.getContext("2d"),viewport:landscape,canvas:wide}).promise;
  fs.writeFileSync("public/plans/source-landscape.png",wide.toBuffer("image/png"));
 }
 const text=await page.getTextContent();console.log("Page",i,"size",viewport.width,viewport.height,"text",text.items.map(t=>t.str).join(" ").slice(0,6000));
}
fs.copyFileSync(source,"public/plans/source-floorplan.pdf");
