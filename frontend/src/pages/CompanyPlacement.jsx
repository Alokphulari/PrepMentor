import { CheckCircle2, Code2, Keyboard, Lock, Mic, Target, Volume2 } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { usePlacement } from "../context/PlacementContext";
import { getCompanyTrack } from "../data/companyPlacementTracks";
import { getCompanyProgress } from "../utils/companyPlacementProgress";

function CompanyPlacement() {
  const { companyId } = useParams();
  const company = getCompanyTrack(companyId);
  const { placementState } = usePlacement();
  if (!company) return <Navigate to="/placement" replace />;
  const communication = getCompanyProgress(companyId);
  const aptitudeDone = placementState.aptitude.hard === "passed";
  const codingDone = placementState.coding.hard === "passed";
  const stages = [
    { title: "Aptitude", detail: company.aptitude, icon: Target, complete: aptitudeDone, unlocked: true, href: "/placement/aptitude/easy" },
    { title: "Coding", detail: company.coding, icon: Code2, complete: codingDone, unlocked: aptitudeDone, href: "/placement/coding" },
    { title: "Typing Communication", detail: company.typing.target, icon: Keyboard, complete: communication.typing, unlocked: codingDone, href: `/practice/typing?company=${company.id}&placement=1` },
    { title: "Speaking Communication", detail: company.speaking.target, icon: Volume2, complete: communication.speaking, unlocked: codingDone && communication.typing, href: `/practice/speaking?company=${company.id}&placement=1` },
    { title: "Final Interview", detail: "Technical and behavioral interview", icon: Mic, complete: placementState.interview.status === "passed", unlocked: codingDone && communication.typing && communication.speaking, href: "/interview/setup" },
  ];
  return <div className="mx-auto max-w-5xl space-y-7"><header className={`rounded-3xl bg-gradient-to-br ${company.accent} p-8 text-white`}><p className="text-xs font-bold uppercase tracking-[.2em] text-white/75">Company-specific hiring journey</p><h1 className="mt-2 text-4xl font-black">{company.name} Placement Track</h1><p className="mt-3 max-w-2xl text-white/85">Pass each company-aligned stage to unlock the next assessment. Communication requirements reflect the role environment.</p></header><section className="space-y-4">{stages.map((stage, index) => { const Icon=stage.icon; return <article key={stage.title} className={`flex flex-col gap-4 rounded-2xl border bg-white p-5 dark:bg-gray-900 sm:flex-row sm:items-center ${stage.unlocked?"border-violet-200 dark:border-violet-900":"border-gray-200 opacity-65 dark:border-gray-800"}`}><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/40"><Icon /></div><div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-wider text-gray-400">Stage {index+1}</p><h2 className="mt-1 text-lg font-extrabold">{stage.title}</h2><p className="mt-1 text-sm text-gray-500">{stage.detail}</p></div>{stage.complete?<span className="flex items-center gap-2 font-bold text-emerald-600"><CheckCircle2 size={19}/> Passed</span>:stage.unlocked?<Link to={stage.href} state={stage.title === "Final Interview" ? {mode:"placement"}:undefined} className="rounded-xl bg-violet-600 px-4 py-2.5 text-center text-sm font-bold text-white">Start stage</Link>:<span className="flex items-center gap-2 text-sm font-bold text-gray-400"><Lock size={17}/> Locked</span>}</article>; })}</section></div>;
}

export default CompanyPlacement;
