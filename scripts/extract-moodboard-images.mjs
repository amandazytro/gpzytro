import fs from 'node:fs';
import sharp from 'sharp';
import {createCanvas,DOMMatrix,ImageData,Path2D} from '@napi-rs/canvas';
Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
const {getDocument,OPS,Util,ImageKind}=await import('pdfjs-dist/legacy/build/pdf.mjs');
const pdf=await getDocument({data:new Uint8Array(fs.readFileSync('referencias/ITENS DE MOODBOARD.pdf')),useSystemFonts:true}).promise;
const directory='referencias/moodboard-pdf-extracted';fs.mkdirSync(directory+'/images',{recursive:true});
const records=[];
for(let n=1;n<=10;n++){
 const page=await pdf.getPage(n),viewport=page.getViewport({scale:1}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
 const ops=await page.getOperatorList();
 await page.render({canvasContext:canvas.getContext('2d'),viewport,canvas}).promise;
 let matrix=[1,0,0,1,0,0],stack=[],index=0;
 for(let i=0;i<ops.fnArray.length;i++){
  const op=ops.fnArray[i],args=ops.argsArray[i];
  if(op===OPS.save)stack.push([...matrix]);
  else if(op===OPS.restore)matrix=stack.pop()??[1,0,0,1,0,0];
  else if(op===OPS.transform)matrix=Util.transform(matrix,args);
  else if(op===OPS.paintImageXObject||op===OPS.paintInlineImageXObject){
   const data=op===OPS.paintImageXObject?await new Promise(resolve=>(args[0].startsWith('g_')?page.commonObjs:page.objs).get(args[0],resolve)):args[0];
   if(!data?.data)continue;
   const channels=data.kind===ImageKind.RGBA_32BPP?4:data.kind===ImageKind.RGB_24BPP?3:null;
   if(!channels)continue;
   const transform=Util.transform(viewport.transform,matrix),corners=[[0,0],[1,0],[0,1],[1,1]].map(p=>[p[0]*transform[0]+p[1]*transform[2]+transform[4],p[0]*transform[1]+p[1]*transform[3]+transform[5]]);
   const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]),name='p'+n+'-image-'+(++index)+'.png';
   await sharp(Buffer.from(data.data),{raw:{width:data.width,height:data.height,channels}}).png().toFile(directory+'/images/'+name);
   records.push({page:n,name,x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys),pixelWidth:data.width,pixelHeight:data.height});
  }
 }
}
fs.writeFileSync(directory+'/images.json',JSON.stringify(records,null,2));
console.log(JSON.stringify(records));
