import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { HISTORY_UPDATED_EVENT } from "../services/history";
import CareerRoadmap from "./CareerRoadmap";

function CareerRoadmapNotice() {
  const [result, setResult] = useState(null);
  useEffect(() => {
    const show = (event) => { if (event.detail?.title) setResult(event.detail); };
    window.addEventListener(HISTORY_UPDATED_EVENT, show);
    return () => window.removeEventListener(HISTORY_UPDATED_EVENT, show);
  }, []);
  if (!result) return null;
  return <div className="fixed inset-0 z-[140] overflow-y-auto bg-gray-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Personalized career roadmap"><div className="mx-auto my-8 max-w-4xl"><div className="mb-3 flex justify-end"><button type="button" onClick={()=>setResult(null)} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-lg dark:bg-gray-900 dark:text-gray-200"><X size={17}/> Close roadmap</button></div><CareerRoadmap score={result.score} module={result.type || result.title} topicPerformance={result.topicPerformance} role={result.role}/></div></div>;
}

export default CareerRoadmapNotice;
