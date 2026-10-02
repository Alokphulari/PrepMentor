import { useRef, useState } from "react";
import { CheckCircle2, Keyboard, Mic, RotateCcw, Square, Volume2 } from "lucide-react";
import { useLocation, useSearchParams } from "react-router-dom";
import { addHistoryEntry } from "../services/history";
import { getCompanyTrack } from "../data/companyPlacementTracks";
import { completeCompanyStage } from "../utils/companyPlacementProgress";
import { markDailyQuestionActivity } from "../services/dailyActivity";

const typingPassages = [
  "Clear communication turns complex technical decisions into shared understanding across engineering and product teams.",
  "A reliable developer tests assumptions, explains tradeoffs, and improves the solution through thoughtful feedback.",
  "During an interview, structure the answer, state the approach, consider edge cases, and verify the final result.",
];
const speakingPrompts = ["Introduce yourself for a software engineering interview.", "Explain a challenging project and how you handled it.", "Describe how you resolve a disagreement with a teammate."];

function words(value) { return value.trim().split(/\s+/).filter(Boolean).length; }

function CommunicationPractice() {
  const { pathname, key: locationKey } = useLocation();
  const [searchParams] = useSearchParams();
  const speaking = pathname.endsWith("/speaking");
  const company = getCompanyTrack(searchParams.get("company"));
  const promptPool = speaking ? speakingPrompts : typingPassages;
  const promptIndex = [...locationKey].reduce((total, character) => total + character.charCodeAt(0), 0) % promptPool.length;
  const content = company ? company[speaking ? "speaking" : "typing"].prompt : promptPool[promptIndex];
  const [value,setValue]=useState(""); const [startedAt,setStartedAt]=useState(null); const [result,setResult]=useState(null); const [listening,setListening]=useState(false); const recognitionRef=useRef(null);
  const startVoice=()=>{const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition)return;const recognition=new Recognition();recognition.continuous=true;recognition.interimResults=true;recognition.onresult=(event)=>{setValue(Array.from(event.results).map((item)=>item[0].transcript).join(" "));markDailyQuestionActivity();};recognition.onend=()=>setListening(false);recognitionRef.current=recognition;recognition.start();setStartedAt((time)=>time||Date.now());setListening(true);};
  const stopVoice=()=>{recognitionRef.current?.stop();setListening(false);};
  const submit=()=>{stopVoice();const elapsed=Math.max(1,(Date.now()-(startedAt||Date.now()))/60000);const typedWords=words(value);if(typedWords>0)markDailyQuestionActivity();const score=speaking?Math.min(100,Math.round((typedWords/60)*100)):Math.max(0,Math.round((value.split("").filter((character,index)=>character===content[index]).length/Math.max(content.length,1))*100));const metric=speaking?`${typedWords} words`:`${Math.round(typedWords/elapsed)} WPM`;const passed=!company||score>=60;const next={score,metric,passed};setResult(next);if(company&&passed)completeCompanyStage(company.id,speaking?"speaking":"typing");addHistoryEntry({title:company?`${company.name} ${speaking?"Speaking":"Typing"} Assessment`:speaking?"Speaking Practice":"Typing Practice",type:speaking?"Speaking Practice":"Typing Practice",mode:company?"placement":"practice",score,duration:metric,topicPerformance:[{topic:speaking?"Communication fluency":"Typing accuracy",percentage:score}]});};
  const reset=()=>{stopVoice();setValue("");setStartedAt(null);setResult(null);};
  return <div className="mx-auto max-w-4xl space-y-6"><header><p className="text-sm font-bold text-violet-600">Communication practice</p><h1 className="mt-1 text-3xl font-black">{speaking?"Speaking Practice":"Typing Practice"}</h1><p className="mt-2 text-gray-500">Submit whenever you are ready. An empty or partial response is allowed and scored honestly.</p></header><section className="surface-card rounded-3xl p-6 sm:p-8"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/40">{speaking?<Volume2/>:<Keyboard/>}</div><p className="mt-6 text-xs font-black uppercase tracking-wider text-gray-400">{speaking?"Speaking prompt":"Copy this passage"}</p><h2 className="mt-2 text-xl font-bold leading-8">{content}</h2><textarea value={value} onFocus={()=>setStartedAt((time)=>time||Date.now())} onChange={(event)=>{setStartedAt((time)=>time||Date.now());setValue(event.target.value);}} rows="8" placeholder={speaking?"Your transcript appears here. You may also type your answer.":"Start typing here…"} className="mt-6 w-full rounded-2xl border border-gray-200 bg-white p-4 leading-7 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900"/>{speaking&&<button type="button" onClick={listening?stopVoice:startVoice} className={`mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${listening?"bg-rose-600 text-white":"border border-gray-200 dark:border-gray-700"}`}>{listening?<><Square size={15}/> Stop recording</>:<><Mic size={16}/> Answer with voice</>}</button>}<div className="mt-6 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-gray-500">{words(value)} words entered</p><div className="flex gap-3">{result&&<button type="button" onClick={reset} className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold"><RotateCcw size={16}/> Try again</button>}<button type="button" onClick={submit} className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white">Submit practice</button></div></div>{result&&<div className="mt-6 rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-950/30"><p className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={19}/> Practice complete</p><p className="mt-2 text-2xl font-black">{result.score}% · {result.metric}</p></div>}</section></div>;
}

export default CommunicationPractice;
