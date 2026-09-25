import sharp from 'sharp';
import path from 'node:path';
import type {getMoodboardContext} from './moodboard-context';
import {PROJECT_REFERENCE} from './project-reference';
type Context=Awaited<ReturnType<typeof getMoodboardContext>>;
const escape=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export const SPATIAL_POLICY_REVISION='plan-coordinate-guide-v1';
export const SPATIAL_RULES={
 revision:SPATIAL_POLICY_REVISION,
 coordinates:{origin:'top-left of the original floorplan',x:'increases to the right',y:'increases downward',units:'normalized, not metres'},
 orientation:'Keep the original floorplan handedness. Image top is not a claimed compass north. Never mirror, transpose axes or rotate the building to satisfy a camera request.',
 boundaries:'Dashed blue room polygons are selection regions, NOT walls. Never extrude them into partitions. Trace walls and openings only from the original architectural drawing.',
 footprints:'Orange contours are current furniture footprints, not walls. Labels identify assignments. Composite parts remain one object. Bounds are axis-aligned annotations; rotationDeg describes object orientation separately.',
 precedence:'Original floorplan for architecture; current annotated footprints for furniture placement. Previous renders and neighboring images provide appearance only and cannot override either.',
};
export async function spatialGuide(context:Context){
 const width=2646,height=1740;
 const rect=(b:{x:number;y:number;width:number;height:number})=>`<rect x="${b.x*width}" y="${b.y*height}" width="${b.width*width}" height="${b.height*height}"/>`;
 const rooms=context.rooms.map(r=>`<polygon points="${r.polygon.map(p=>p.x*width+','+p.y*height).join(' ')}" fill="none" stroke="#176bd1" stroke-width="3" stroke-dasharray="12 9"/>`).join('');
 const furniture=context.assignments.map(a=>`<g fill="none" stroke="#d65400" stroke-width="3">${(a.parts?.length?a.parts:[a.bounds]).map(rect).join('')}</g><text x="${a.bounds.x*width+3}" y="${a.bounds.y*height+16}" font-size="16" font-family="sans-serif" fill="#862e00" stroke="white" stroke-width="3" paint-order="stroke">${escape(a.instanceCode)}</text>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${rooms}${furniture}<rect x="0" y="0" width="1000" height="34" fill="white"/><text x="8" y="24" font-size="20" font-family="sans-serif">ORIGIN: TOP LEFT | +X RIGHT | +Y DOWN | DASHED BLUE = SELECTION, NOT WALL</text></svg>`;
 const bytes=await sharp(path.join(process.cwd(),'public',PROJECT_REFERENCE.image)).resize(width,height,{fit:'fill'}).composite([{input:Buffer.from(svg)}]).png().toBuffer();
 return {name:'CURRENT SPATIAL GUIDE: original plan orientation, live instance IDs and footprints; colored lines are annotations, never architecture',image:'data:image/png;base64,'+bytes.toString('base64'),detail:'high'};
}
