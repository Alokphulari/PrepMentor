import { useEffect, useRef, useState } from "react";
import { authorizedRequest } from "../services/authService";
import { hasRemoteApi } from "../services/api";
import { ArrowRight, BriefcaseBusiness, CalendarCheck2 } from "lucide-react";
import { Link } from "react-router-dom";
import { buildCareerRoadmap } from "../utils/careerRoadmap";

function CareerRoadmap(props) {
  const lock = useRef(false);
  const [remote,setRemote]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const generate=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setError("");try{const {plan}=await authorizedRequest("/api/career-roadmap/generate",{method:"POST",timeoutMs:65000});setRemote(plan);}catch(failure){setError(failure.message);}finally{lock.current=false;setBusy(false);}};
  useEffect(()=>{if(!hasRemoteApi)return;let active=true;authorizedRequest("/api/career-roadmap",{timeoutMs:65000}).then(({plan})=>{if(active)setRemote(plan);}).catch(()=>{});return()=>{active=false;};},[]);
  const roadmap = remote ? {title:remote.role,summary:remote.readinessSummary,steps:remote.steps.map((step)=>({...step,task:step.tasks.join(" ")+" Success: "+step.successMetric}))} : buildCareerRoadmap(props);
  return <section className="surface-card overflow-hidden rounded-3xl"><div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white sm:p-7"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-violet-100"><BriefcaseBusiness size={16}/> Personalized career roadmap</p><h2 className="mt-2 text-2xl font-extrabold">{roadmap.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">{roadmap.summary}</p></div>{hasRemoteApi&&<div className="p-5"><button disabled={busy} onClick={generate} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{busy?"Generating roadmap...":remote?"Regenerate roadmap":"Generate roadmap"}</button><p role="status">{error || remote?.source}</p></div>}{remote&&<div className="grid gap-4 px-5 sm:grid-cols-2 sm:px-7">{[["strengths","Strengths"],["gaps","Gaps to address"]].map(([key,label])=>{const items=remote[key] || (key==="strengths"?remote.currentStrengths:[]) || [];return items.length>0&&<div key={key} className="rounded-2xl bg-indigo-50/50 p-4 dark:bg-indigo-950/30"><h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{label}</h3><ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-6 text-gray-600 dark:text-gray-300">{items.map((item)=><li key={item}>{item}</li>)}</ul></div>;})}</div>}<div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-7">{roadmap.steps.map((step,index)=><article key={step.period} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-sm font-black text-indigo-600 dark:bg-indigo-950">{index+1}</span><p className="text-xs font-black uppercase tracking-wider text-gray-400">{step.period}</p></div><h3 className="mt-3 font-extrabold">{step.title}</h3><p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{step.task}</p></article>)}</div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-7"><p className="flex items-center gap-2 text-xs font-bold text-gray-500"><CalendarCheck2 size={16}/> Based on recorded candidate evidence</p><Link to="/learning" className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-300">Start learning plan <ArrowRight size={16}/></Link></div></section>;
}

export default CareerRoadmap;
