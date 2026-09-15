import { useEffect, useState } from "react";
import { AudioLines, LoaderCircle, Mic } from "lucide-react";
import avaInterviewer from "../assets/ava-interviewer.png";

function InterviewAvatar() {
  const [voiceState, setVoiceState] = useState({ speaking: false, listening: false, transcribing: false });

  useEffect(() => {
    const update = (event) => setVoiceState(event.detail || {});
    window.addEventListener("prepmentor:interview-voice-state", update);
    return () => window.removeEventListener("prepmentor:interview-voice-state", update);
  }, []);

  const status = voiceState.transcribing
    ? { label: "Processing your answer", detail: "Converting your recording into a genuine response", tone: "amber" }
    : voiceState.listening
      ? { label: "Listening to you", detail: "Speak naturally—Ava is capturing your response", tone: "rose" }
      : voiceState.speaking
        ? { label: "Ava is asking", detail: "Listen carefully before beginning your response", tone: "indigo" }
        : { label: "Ready for your answer", detail: "Use voice or type when you are ready", tone: "emerald" };
  const statusClasses = status.tone === "rose"
    ? "bg-rose-500 text-rose-600 dark:text-rose-300"
    : status.tone === "amber"
      ? "bg-amber-500 text-amber-600 dark:text-amber-300"
      : status.tone === "indigo"
        ? "bg-indigo-500 text-indigo-600 dark:text-indigo-300"
        : "bg-emerald-500 text-emerald-600 dark:text-emerald-300";

  return <section className="relative mb-6 overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 dark:border-indigo-900/60 dark:from-indigo-950/45 dark:via-gray-900 dark:to-violet-950/35 sm:p-6">
    <div className="absolute -right-10 -top-14 h-40 w-40 rounded-full bg-violet-400/15 blur-3xl" />
    <div className="relative flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative shrink-0"><span className={`absolute inset-0 rounded-full opacity-20 ${voiceState.speaking||voiceState.listening?"animate-ping":""} ${statusClasses.split(" ")[0]}`}/><div className={`relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/25 transition-transform duration-300 dark:border-gray-800 ${voiceState.speaking?"scale-105":""}`}><img src={avaInterviewer} alt="Ava, PrepMentor AI interview coach" className="h-full w-full object-cover object-top" /></div><span className={`absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-white dark:border-gray-900 ${statusClasses.split(" ")[0]}`}>{voiceState.transcribing?<LoaderCircle size={13} className="animate-spin"/>:<Mic size={13}/>}</span></div>
      <div className="text-center sm:text-left"><div className="flex items-center justify-center gap-2 sm:justify-start"><span className={`h-2 w-2 animate-pulse rounded-full ${statusClasses.split(" ")[0]}`}/><p className={`text-xs font-black uppercase tracking-[0.18em] ${statusClasses.split(" ").slice(1).join(" ")}`}>{status.label}</p></div><h2 className="mt-2 text-xl font-extrabold">Ava, your live interview coach</h2><p className="mt-1 max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400">{status.detail}</p><div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 shadow-sm dark:bg-gray-800 dark:text-indigo-300"><AudioLines size={15}/><span className="flex items-end gap-0.5" aria-hidden="true">{[2,4,3,5,2].map((height,index)=><span key={index} className={`w-0.5 rounded-full bg-indigo-500 ${voiceState.speaking||voiceState.listening?"animate-pulse":""}`} style={{height:`${height*3}px`,animationDelay:`${index*100}ms`}}/>)}</span>{voiceState.speaking?"Question audio playing":voiceState.listening?"Voice answer recording":"Voice-guided session"}</div></div>
    </div>
  </section>;
}

export default InterviewAvatar;
