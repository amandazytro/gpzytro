import { Plus } from "lucide-react";
import type { HierarchyKind } from "@/domain/models";
import type { Selection, WorkspaceView } from "@/services/application";
export function Hierarchy({view,onSelect,onCreate}:{view:WorkspaceView;onSelect:(key:keyof Selection,id:string|null)=>void;onCreate:(kind:HierarchyKind)=>void}){
  const levels:{kind:HierarchyKind;key:keyof Selection;label:string;rows:{id:string;name:string}[];selected:string|null;empty:string;canCreate:boolean}[]=[
    {kind:"project",key:"projectId",label:"Project",rows:view.projects,selected:view.project?.id??null,empty:"No projects available",canCreate:true},
    {kind:"building",key:"buildingId",label:"Building",rows:view.buildings,selected:view.building?.id??null,empty:"No buildings available",canCreate:!!view.project},
    {kind:"unit",key:"unitId",label:"Unit",rows:view.units,selected:view.unit?.id??null,empty:"No units available",canCreate:!!view.building},
    {kind:"layout",key:"layoutId",label:"Layout",rows:view.layouts,selected:view.layout?.id??null,empty:"No layouts available yet",canCreate:!!view.unit},
    {kind:"room",key:"roomId",label:"Room",rows:view.rooms,selected:view.room?.id??null,empty:"No rooms configured",canCreate:!!view.layout},
  ];
  return <div className="hierarchy"><div className="section-label">PROJECT EXPLORER</div><div className="hierarchy-selectors">
    {levels.map(level=><div key={level.key} className="hierarchy-field"><div><label htmlFor={level.key}>{level.label}</label><button aria-label={"Add "+level.kind} disabled={!level.canCreate} onClick={()=>onCreate(level.kind)}><Plus size={14}/></button></div><select id={level.key} value={level.selected??""} disabled={!level.rows.length} onChange={e=>onSelect(level.key,e.target.value)}>{!level.rows.length&&<option value="">{level.empty}</option>}{level.rows.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select>
      {level.kind==="building"&&view.floors.length>0&&<label className="floor-select">Floor<select aria-label="Floor" value={view.floor?.id??""} onChange={e=>onSelect("floorId",e.target.value||null)}><option value="">All floors</option>{view.floors.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>}
    </div>)}
  </div></div>;
}
