import fs from 'node:fs';
const path='src/components/chat/instance-selector.tsx';let s=fs.readFileSync(path,'utf8');
s=s.replace("type Rectangle=", "type Handle='move'|'n'|'s'|'e'|'w'|'ne'|'nw'|'se'|'sw';\ntype Rectangle=");
s=s.replace(' const origin=useRef',` const [adjustment,setAdjustment]=useState<{id:string;rect:Rectangle}|null>(null);
 const gesture=useRef<{id:string;handle:Handle;start:{x:number;y:number};before:Rectangle;pointerId:number;moved:boolean}|null>(null);
 const suppressClick=useRef(false);
 function adjusted(g:NonNullable<typeof gesture.current>,p:{x:number;y:number}):Rectangle{
  const dx=p.x-g.start.x,dy=p.y-g.start.y,r=g.before;
  if(g.handle==='move')return {...r,x:Math.max(0,Math.min(882-r.width,r.x+dx)),y:Math.max(0,Math.min(580-r.height,r.y+dy))};
  let left=r.x,top=r.y,right=r.x+r.width,bottom=r.y+r.height;
  if(g.handle.includes('w'))left=Math.max(0,Math.min(right-3,left+dx));
  if(g.handle.includes('e'))right=Math.min(882,Math.max(left+3,right+dx));
  if(g.handle.includes('n'))top=Math.max(0,Math.min(bottom-3,top+dy));
  if(g.handle.includes('s'))bottom=Math.min(580,Math.max(top+3,bottom+dy));
  return {x:left,y:top,width:right-left,height:bottom-top};
 }
 function cancelAdjustment(){if(gesture.current){suppressClick.current=true;gesture.current=null;setAdjustment(null);}}
 function beginPointer(e:PointerEvent<SVGSVGElement>){
  suppressClick.current=false;
  if(drawing){start(e);return;}
  if(!ready||!e.isPrimary||e.button!==0||gesture.current)return;
  const element=(e.target as Element).closest('[data-handle],[data-instance-id]');
  const id=element?.getAttribute('data-instance-id')??active;
  if(!element||!id)return;
  const item=planProducts.find(p=>p.id===id),p=point(e);if(!item||!p)return;
  e.preventDefault();setActive(id);e.currentTarget.setPointerCapture(e.pointerId);
  const original=rectangles[id]??item;
  gesture.current={id,handle:(element.getAttribute('data-handle')??'move') as Handle,start:p,before:{x:original.x,y:original.y,width:original.width,height:original.height},pointerId:e.pointerId,moved:false};
 }
 function updatePointer(e:PointerEvent<SVGSVGElement>){
  const g=gesture.current;if(!g){move(e);return;}if(g.pointerId!==e.pointerId)return;
  const p=point(e);if(!p)return;
  if(Math.hypot(p.x-g.start.x,p.y-g.start.y)>1)g.moved=true;
  if(g.moved)setAdjustment({id:g.id,rect:adjusted(g,p)});
 }
 function endPointer(e:PointerEvent<SVGSVGElement>){
  const g=gesture.current;if(!g){finish(e);return;}if(g.pointerId!==e.pointerId)return;
  const p=point(e);gesture.current=null;setAdjustment(null);
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  suppressClick.current=true;
  if(g.moved&&p){persist({...rectangles,[g.id]:adjusted(g,p)});setSelected(previous=>[...new Set([...previous,g.id])]);}
  else if(g.handle==='move')toggle(g.id);
 }
 const origin=useRef`);
s=s.replace("if(e.key==='Escape'&&drawing){e.preventDefault();cancelDraw();}","if(e.key==='Escape'){if(gesture.current){e.preventDefault();cancelAdjustment();}else if(drawing){e.preventDefault();cancelDraw();}}");
s=s.replace('Clique nos móveis ou superfícies da planta para selecionar. Use “Desenhar retângulo” para demarcar o contorno de um item.','Arraste um retângulo para movê-lo. Clique nele e puxe os pontos das bordas ou dos cantos para aumentar ou diminuir.');
s=s.replace(' const chosen=',` const activeBounds=instance?(adjustment?.id===instance.id?adjustment.rect:rectangles[instance.id]??instance):null;
 const handles=activeBounds?([
 ['nw',activeBounds.x,activeBounds.y],['n',activeBounds.x+activeBounds.width/2,activeBounds.y],['ne',activeBounds.x+activeBounds.width,activeBounds.y],
 ['w',activeBounds.x,activeBounds.y+activeBounds.height/2],['e',activeBounds.x+activeBounds.width,activeBounds.y+activeBounds.height/2],
 ['sw',activeBounds.x,activeBounds.y+activeBounds.height],['s',activeBounds.x+activeBounds.width/2,activeBounds.y+activeBounds.height],['se',activeBounds.x+activeBounds.width,activeBounds.y+activeBounds.height]
 ] as [Handle,number,number][]):[];
 const chosen=`);
s=s.replace('onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={()=>{origin.current=null;setDraft(null);}}',`onPointerDown={beginPointer} onPointerMove={updatePointer} onPointerUp={endPointer} onPointerCancel={()=>{cancelAdjustment();origin.current=null;setDraft(null);}} onLostPointerCapture={()=>{cancelAdjustment();origin.current=null;}} onClickCapture={e=>{if(suppressClick.current){e.preventDefault();e.stopPropagation();suppressClick.current=false;}}}`);
s=s.replace('(rectangles[p.id]?[rectangles[p.id]]:p.parts??[p])','(adjustment?.id===p.id?[adjustment.rect]:rectangles[p.id]?[rectangles[p.id]]:p.parts??[p])');
s=s.replace('{draft&&<rect',`{!drawing&&instance&&activeBounds&&visible.some(p=>p.id===instance.id)&&<g className="instance-adjust-controls"><rect className="instance-adjust-outline" x={activeBounds.x} y={activeBounds.y} width={activeBounds.width} height={activeBounds.height}/>{handles.map(([handle,x,y])=><rect key={handle} data-handle={handle} data-instance-id={instance.id} className={'instance-resize-handle handle-'+handle} x={x-3} y={y-3} width={6} height={6} rx={1}><title>Arraste para redimensionar</title></rect>)}</g>}{draft&&<rect`);
fs.writeFileSync(path,s);
