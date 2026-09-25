import fs from 'node:fs';
const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));
edit('src/components/chat/astra-chat.tsx',s=>s.replace('const [planEditing,setPlanEditing]=useState(false);','const [planEditing,setPlanEditing]=useState(false);\n  const [planRoomId,setPlanRoomId]=useState<string|null>(null);').replace('<dialog ref={referenceDialog} className="astra-dialog">','<dialog ref={referenceDialog} className="astra-dialog" onClose={()=>setPlanRoomId(null)}>').replace('<ProjectPlan editing={planEditing}','<ProjectPlan selectedRoomId={planRoomId} onSelectRoom={setPlanRoomId} editing={planEditing}').replace('key={room.id} onClick={()=>openRoom(room.id)}><span>{String(index+1)','key={room.id} aria-pressed={planRoomId===room.id} onClick={()=>setPlanRoomId(room.id)}><span>{String(index+1)'));
edit('src/components/chat/project-plan.tsx',s=>{
 s=s.replace('export function ProjectPlan({editing=false,...props}: FloorplanProps & {editing?:boolean}) {','export function ProjectPlan({editing=false,selectedRoomId,onSelectRoom,...props}: FloorplanProps & {editing?:boolean;selectedRoomId:string|null;onSelectRoom:(id:string|null)=>void}) {');
 s=s.replace('  const planProducts=applyPlanGeometry(originalPlanProducts,rectangles);',`  const allProducts=applyPlanGeometry(originalPlanProducts,rectangles);
  const selectedRoom=props.rooms.find(r=>r.id===selectedRoomId);
  const region=selectedRoom?.planRegion?.points??[];
  const xs=region.map(p=>p.x*882),ys=region.map(p=>p.y*580);
  const planProducts=selectedRoom?allProducts.filter(p=>p.roomId===selectedRoomId||(!p.roomId&&p.category!=='Mobiliário'&&p.x+p.width>=Math.min(...xs)&&p.x<=Math.max(...xs)&&p.y+p.height>=Math.min(...ys)&&p.y<=Math.max(...ys))):[];
  const roomGroups=planModelGroups.map(m=>({...m,instances:planProducts.filter(p=>p.modelId===m.id)})).filter(m=>m.instances.length);
  const roomPath=region.map((p,i)=>(i?'L':'M')+(p.x*882)+' '+(p.y*580)).join(' ')+' Z';`);
 s=s.replace("  const product =", "  useEffect(()=>{setSelected(null);setActiveModel(null);setEditorId(null);},[selectedRoomId]);\n  const product =");
 s=s.replace('const productModel=planModelGroups.find','const productModel=roomGroups.find').replace("const furnitureGroups=planModelGroups.filter","const furnitureGroups=roomGroups.filter");
 s=s.replace("{editing?'Clique em um móvel ou superfície para cadastrar o produto.':'Passe o mouse sobre um elemento para localizar desenhos semelhantes.'}","{!selectedRoom?'1. Selecione um ambiente na planta ou na lista abaixo.':editing?'2. Clique em um móvel deste ambiente para cadastrar o produto.':'2. Passe o mouse sobre os móveis do ambiente selecionado.'}");
 s=s.replace('        {!editing&&<details',`        {selectedRoom&&<div className="plan-room-focus"><div><small>AMBIENTE SELECIONADO</small><strong>{selectedRoom.name}</strong><span>{planProducts.length} elementos disponíveis</span></div><button type="button" onClick={()=>onSelectRoom(null)}>Trocar ambiente</button><button type="button" onClick={()=>props.onOpenRoom(selectedRoom)}>Usar ambiente na criação</button></div>}
        {!editing&&selectedRoom&&<details`);
 s=s.replace('{planModelGroups.map(m=>','{roomGroups.map(m=>').replace("planModelGroups.find(m=>m.id===activeModel)?.instances.length","roomGroups.find(m=>m.id===activeModel)?.instances.length");
 s=s.replace("'Modo de cadastro ativo. Selecione um elemento na planta.'","selectedRoom?'Modo de cadastro ativo neste ambiente.':'Selecione primeiro um ambiente na planta.'");
 s=s.replace('<Floorplan {...props} rooms={editing?[]:props.rooms}', '<Floorplan {...props} activeRoomId={selectedRoomId} onOpenRoom={room=>onSelectRoom(room.id)} rooms={props.rooms}');
 s=s.replace('<defs><marker','<defs><clipPath id={id+\'-room-clip\'}><path d={roomPath}/></clipPath><marker');
 s=s.replace('{planProducts.map(p => <g','<g clipPath={selectedRoom?\'url(#\'+id+\'-room-clip)\':undefined}>{planProducts.map(p => <g');
 s=s.replace("            {product && !editing", "            </g>\n            {product && !editing");
 return s;
});
