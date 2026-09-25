"use client";
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {LoaderCircle,Upload,X} from 'lucide-react';
import {planModels,type PlanProduct} from '../../data/plan-products';
import {registeredProductFor,type RegisteredPlanProduct} from '../../domain/plan-product-catalog';

export function PlanProductEditor({instance,instances,products,onSaved,onClose}:{instance:PlanProduct;instances:readonly PlanProduct[];products:RegisteredPlanProduct[];onSaved:(products:RegisteredPlanProduct[])=>void;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{dialog.current?.showModal();},[]);
 const previous=registeredProductFor(products,instance);
 const group=planModels.find(m=>m.id===instance.modelId);
 const modelCount=instances.filter(p=>p.modelId===instance.modelId).length;
 const [scope,setScope]=useState<'model'|'instance'>(instance.modelId?(previous?.scope??'model'):'instance');
 const [name,setName]=useState(previous?.name??'');
 const [manufacturer,setManufacturer]=useState(previous?.manufacturer??'');
 const [finish,setFinish]=useState(previous?.finish??'');
 const [link,setLink]=useState(previous?.link??'');
 const [photo,setPhoto]=useState<string>();
 const [reading,setReading]=useState(false);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const ownRecord=products.find(r=>r.scope===scope&&r.targetId===(scope==='model'?instance.modelId:instance.id));
 const preview=photo??previous?.imageUrl;
 async function choosePhoto(file?:File){
  if(!file)return;setError('');setNotice('');
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5_000_000){setError('Use PNG, JPEG ou WebP de até 5 MB.');return;}
  setReading(true);
  try{const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Não foi possível ler a foto.'));reader.readAsDataURL(file);});setPhoto(data);}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível ler a foto.');}
  finally{setReading(false);}
 }
 async function submit(event:FormEvent){
  event.preventDefault();if(saving||reading)return;setSaving(true);setError('');setNotice('');
  try{
   let upload=photo;
   // Changing a model registration into an instance override may reuse its existing photo.
   if(!upload&&previous&&previous.imageUrl!==ownRecord?.imageUrl){
    const response=await fetch(previous.imageUrl);if(!response.ok)throw new Error('Selecione a foto novamente.');
    const blob=await response.blob();
    upload=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Selecione a foto novamente.'));reader.readAsDataURL(blob);});
   }
   if(!upload&&!ownRecord)throw new Error('Adicione uma foto do produto.');
   const response=await fetch('/api/plan-products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope,targetId:scope==='model'?instance.modelId:instance.id,name,manufacturer,finish,link,...(upload?{photo:upload}:{})})});
   const result=await response.json();if(!response.ok)throw new Error(result.error??'Não foi possível salvar.');
   onSaved(result.products);setPhoto(undefined);setNotice(scope==='model'?'Cadastro salvo para o modelo. Exceções individuais foram preservadas.':'Cadastro salvo somente para esta instância.');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}
  finally{setSaving(false);}
 }
 return <dialog ref={dialog} className="plan-editor-dialog" aria-label="Cadastro do móvel" onCancel={e=>{e.preventDefault();if(!saving)onClose();}}><section className="plan-editor" aria-label="Cadastro do móvel">
  <header><div><small>{instance.instanceCode} · {group?.name??'Sem modelo'}</small><h3>Cadastrar produto</h3></div><button type="button" aria-label="Fechar cadastro" onClick={onClose} disabled={saving}><X size={17}/></button></header>
  <form onSubmit={submit} onChange={()=>setNotice('')}>
   <fieldset disabled={saving}>
    <div className="plan-editor-photo">{preview?<img src={preview} alt="Foto do produto cadastrado"/>:<Upload size={28}/>}<label>Foto do produto<input type="file" disabled={reading} accept="image/png,image/jpeg,image/webp" onChange={e=>void choosePhoto(e.target.files?.[0])}/></label><small>PNG, JPEG ou WebP · até 5 MB</small></div>
    <div className="plan-editor-fields">
     <label>Aplicar cadastro a<select value={scope} onChange={e=>{setScope(e.target.value as 'model'|'instance');setNotice('');}}><option value="model" disabled={!group}>Todas as {modelCount} ocorrências de {group?.id??'sem modelo'}</option><option value="instance">Somente {instance.instanceCode}</option></select></label>
     <label>Nome do móvel<input autoFocus required maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></label>
     <label>Fabricante<input required maxLength={160} value={manufacturer} onChange={e=>setManufacturer(e.target.value)}/></label>
     <label>Acabamento<textarea required rows={2} maxLength={1200} placeholder="Ex.: estrutura preta, tecido bege e tampo em carvalho." value={finish} onChange={e=>setFinish(e.target.value)}/></label>
     <label>Link do produto <small>(opcional)</small><input type="url" maxLength={2000} placeholder="https://" value={link} onChange={e=>setLink(e.target.value)}/></label>
    </div>
   </fieldset>
   {error&&<p className="plan-editor-error" role="alert">{error}</p>}
   {notice&&<p className="plan-editor-notice" role="status">{notice}</p>}
   <footer><small>O cadastro substitui a referência ilustrativa no balão da planta.</small><button type="submit" disabled={saving||reading}>{saving?<><LoaderCircle size={15} className="astra-spin"/>Salvando…</>:reading?'Lendo foto…':'Salvar produto'}</button></footer>
  </form>
 </section></dialog>;
}