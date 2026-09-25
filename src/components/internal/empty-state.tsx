import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
export function EmptyState({title,description,action,compact=false}:{title:string;description?:string;action?:ReactNode;compact?:boolean}){
  return <div className={compact?"empty-state compact":"empty-state"}><Inbox size={25} aria-hidden="true"/><h3>{title}</h3>{description&&<p>{description}</p>}{action}</div>
}
