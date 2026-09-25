import fs from 'node:fs';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import sharp from 'sharp';
// Trace visible dark linework. Coloured zone fills are discarded, never inferred as geometry.
function simplify(points,epsilon=.45){
 if(points.length<3)return points;
 const a=points[0],b=points.at(-1),dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;
 let max=0,index=0;
 for(let i=1;i<points.length-1;i++){const p=points[i],t=den?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)):0;const d=Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);if(d>max){max=d;index=i;}}
 return max>epsilon?[...simplify(points.slice(0,index+1),epsilon).slice(0,-1),...simplify(points.slice(index),epsilon)]:[a,b];
}
fs.mkdirSync('public/plans',{recursive:true});
for(const [source,name] of [['PLANTA BAIXA.png','floorplan'],['PLANTA DE TETO.png','ceiling']]){
 const input='src/PLANTAS/'+source,image=await loadImage(input),w=image.width,h=image.height;
 const c=createCanvas(w,h),ctx=c.getContext('2d');ctx.drawImage(image,0,0);
 const pixels=ctx.getImageData(0,0,w,h).data,mask=new Uint8Array(w*h);
 const histogram=new Map();
 for(let i=0;i<mask.length;i++){const r=pixels[i*4],g=pixels[i*4+1],b=pixels[i*4+2];const key=[r>>3,g>>3,b>>3].join(',');const entry=histogram.get(key)??{count:0,r:0,g:0,b:0};entry.count++;entry.r+=r;entry.g+=g;entry.b+=b;histogram.set(key,entry);}
 const backgrounds=[...histogram.values()].filter(v=>v.count>700&&Math.max(v.r,v.g,v.b)/v.count>130).map(v=>[v.r/v.count,v.g/v.count,v.b/v.count]);
 for(let i=0;i<mask.length;i++){
  const [r,g,b,a]=pixels.slice(i*4,i*4+4),max=Math.max(r,g,b),min=Math.min(r,g,b);
  const background=backgrounds.some(c=>Math.max(Math.abs(r-c[0]),Math.abs(g-c[1]),Math.abs(b-c[2]))<13);
  mask[i]=!background&&a>127&&((max<205&&max-min<35)||max<130||(b>r*1.2&&b>g*1.05&&max<230))?1:0;
 }
 const edges=[],outgoing=new Map();
 function edge(x,y,xx,yy,d){const e={x,y,xx,yy,d,used:false};edges.push(e);const key=y*(w+1)+x;const list=outgoing.get(key)??[];list.push(e);outgoing.set(key,list);}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[y*w+x]){
  if(!y||!mask[(y-1)*w+x])edge(x,y,x+1,y,0);
  if(x===w-1||!mask[y*w+x+1])edge(x+1,y,x+1,y+1,1);
  if(y===h-1||!mask[(y+1)*w+x])edge(x+1,y+1,x,y+1,2);
  if(!x||!mask[y*w+x-1])edge(x,y+1,x,y,3);
 }
 const paths=[];
 for(const start of edges){if(start.used)continue;let e=start,points=[];
  while(e&&!e.used){e.used=true;points.push([e.x,e.y]);if(e.xx===start.x&&e.yy===start.y)break;
   const candidates=(outgoing.get(e.yy*(w+1)+e.xx)??[]).filter(n=>!n.used),d=e.d;
   e=[(d+1)%4,d,(d+3)%4,(d+2)%4].map(dir=>candidates.find(n=>n.d===dir)).find(Boolean);
  }
  if(points.length<4)continue;
  let area=0;points.forEach((p,i)=>{const n=points[(i+1)%points.length];area+=p[0]*n[1]-n[0]*p[1];});
  if(Math.abs(area)<3)continue;
  points.push(points[0]);points=simplify(points);
  paths.push('M'+points.map(p=>p.join(' ')).join('L')+'Z');
 }
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'"><title>'+name+' - monochrome vector trace</title><desc>Vectorized from a low resolution PNG. Visible linework only; not a measured CAD drawing.</desc><rect width="100%" height="100%" fill="white"/><path fill="black" fill-rule="evenodd" d="'+paths.join('')+'"/></svg>';
 fs.writeFileSync('public/plans/'+name+'.svg',svg);
 fs.copyFileSync(input,'public/plans/'+name+'-original.png');
 await sharp(Buffer.from(svg)).resize(w*3,h*3).png().toFile('public/plans/'+name+'.png');
 console.log(JSON.stringify({name,width:w,height:h,contours:paths.length,bytes:svg.length}));
}