export function productGroup(p:{name:string;category:string;location?:string;group?:string}){
 if(p.group)return p.group;
 const name=p.name.toLowerCase();
 if(/booth/.test(name))return 'Cabine de trabalho';
 if(/armchair|lounge chair/.test(name))return 'Poltrona';
 if(/sofa/.test(name))return 'Sofá';
 if(/coffee table/.test(name))return 'Mesa de centro';
 if(/dining chair/.test(name))return 'Cadeira de reunião';
 if(/office chair/.test(name))return 'Cadeira de escritório';
 if(/rug/.test(name))return 'Tapete';
 if(/inlay/.test(name))return 'Piso decorativo';
 if(/reception desk/.test(name))return 'Balcão de recepção';
 if(/niche/.test(name))return 'Nicho existente';
 if(/exposed services/.test(name))return 'Teto do escritório';
 if(p.category==='Planting')return 'Plantas e vasos';
 if(p.category==='Wall')return p.name; // Complementary wall finishes are not mutually exclusive.
 return ({Ceiling:'Teto',Lighting:'Iluminação',Flooring:'Piso',Joinery:'Marcenaria',Door:'Porta',Glazing:'Divisória de vidro',Accessory:'Arte',Wood:'Madeira',Metal:'Metal',Plaster:'Revestimento',Paint:'Pintura',Tile:'Pedra e revestimento',Microcement:'Microcimento'} as Record<string,string>)[p.category]??p.category;
}
export const COMPOSITION_REVISION='project-instances-spatial-v2';
