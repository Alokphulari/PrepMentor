import { useState } from "react";
import { BookOpen, ExternalLink, Play, Search } from "lucide-react";
import { getLearningReferences } from "../utils/learningPlan";

function ResourceCard({ reference, topic, onOpen }) {
  const [imageFailed, setImageFailed] = useState(false);
  const url = new URL(reference.url);
  const video = url.hostname === "www.youtube.com";
  const videoId = url.searchParams.get("v");
  const title = reference.title.replace(/\s*Â?·\s*/g, " · ");
  const Icon = video ? Play : BookOpen;

  return <a href={reference.url} target="_blank" rel="noopener noreferrer" onClick={onOpen}
    className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500 dark:border-gray-700 dark:bg-gray-900">
    <div className={`relative flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br ${video ? "from-rose-950 via-red-800 to-orange-600" : "from-indigo-950 via-indigo-700 to-teal-500"}`}>
      <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full border-[20px] border-white/10" aria-hidden="true"/>
      <div className="px-5 text-center text-white"><Icon className="mx-auto mb-3" size={32} aria-hidden="true"/><p className="line-clamp-2 text-lg font-extrabold">{topic}</p></div>
      {videoId && !imageFailed && <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" loading="lazy" onError={() => setImageFailed(true)} className="absolute inset-0 h-full w-full object-cover"/>}
      <span className="absolute left-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-bold text-white">{video ? "YouTube" : "Website"}</span>
      {video && <span className="absolute bottom-3 right-3 rounded-full bg-white p-2 text-red-600"><Play size={18} fill="currentColor" aria-hidden="true"/></span>}
    </div>
    <div className="flex flex-1 flex-col p-4"><p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{url.hostname.replace(/^www\./, "")}</p><h3 className="mt-2 text-sm font-bold leading-6">{title}</h3><p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">{video ? videoId ? "Follow the video lesson at your own pace." : "Explore video tutorials for this topic." : "Explore explanations, examples, and practice resources."}</p><span className="mt-4 flex items-center justify-between gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-300">{video ? videoId ? "Watch on YouTube" : "Find videos on YouTube" : "Visit website"}<ExternalLink size={14}/></span><span className="sr-only">Opens in a new tab</span></div>
  </a>;
}

export default function LearningResources({ topic, onOpen }) {
  return <div className="mt-4 grid gap-4 sm:grid-cols-2">{getLearningReferences(topic).map((reference) => <ResourceCard key={reference.url} reference={reference} topic={topic} onOpen={onOpen}/>)}</div>;
}

export function LearningResourceLibrary() {
  const [topic, setTopic] = useState("JavaScript");
  return <section className="surface-card rounded-3xl p-6 sm:p-8"><div className="flex items-center gap-3"><span className="rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Search size={22}/></span><div><h2 className="text-xl font-extrabold">Explore learning resources</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Watch a lesson, read a guide, then put it into practice.</p></div></div><div className="mt-5 flex flex-wrap gap-2" aria-label="Resource topics">{["JavaScript", "Python", "Data structures", "Percentages", "Algebra"].map((name) => <button key={name} type="button" aria-pressed={topic === name} onClick={() => setTopic(name)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${topic === name ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-indigo-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"}`}>{name}</button>)}</div><LearningResources topic={topic}/></section>;
}
