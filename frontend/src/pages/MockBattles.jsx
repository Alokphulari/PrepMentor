import { useEffect, useState } from "react";
import { Copy, LoaderCircle, ShieldCheck, Swords, Trophy, Users } from "lucide-react";
import { createBattle, getBattle, joinBattle, submitBattle } from "../services/battleService";
import { hasRemoteApi } from "../services/api";
import { markDailyQuestionActivity } from "../services/dailyActivity";

const modes = ["aptitude", "coding", "interview", "typing", "speaking"];

function MockBattles() {
  const [mode, setMode] = useState("aptitude");
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState(null);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!room?.code || room.status === "complete") return undefined;
    const timer = window.setInterval(() => {
      getBattle(room.code).then(setRoom).catch(() => {});
    }, 2000);
    return () => window.clearInterval(timer);
  }, [room?.code, room?.status]);

  const run = async (action) => {
    setBusy(true);
    setError("");
    try {
      setRoom(await action());
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  if (!room) {
    return (
      <div className="mx-auto max-w-5xl space-y-7">
        <header className="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-8 text-white shadow-xl shadow-violet-600/15">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Swords /></div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-violet-100">Live head-to-head challenge</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Mock Battles</h1>
          <p className="mt-3 max-w-2xl text-violet-100">Create a private room, share its code, and compete live with one other PrepMentor user.</p>
        </header>
        {!hasRemoteApi && <p className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-800">Mock Battles needs the backend. Start it on port 4000 and set VITE_API_BASE_URL=http://localhost:4000.</p>}
        {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-extrabold">Create a battle</h2>
            <label className="mt-5 block text-sm font-bold">Test type</label>
            <select value={mode} onChange={(event) => setMode(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-transparent p-3 capitalize dark:border-gray-700">{modes.map((item) => <option key={item}>{item}</option>)}</select>
            <button disabled={busy || !hasRemoteApi} onClick={() => run(() => createBattle(mode))} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 font-bold text-white disabled:opacity-50"><Swords size={18} /> Create room</button>
          </section>
          <section className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-extrabold">Join with a code</h2>
            <label className="mt-5 block text-sm font-bold">Six-character room code</label>
            <input value={joinCode} maxLength={6} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="A1B2C3" className="mt-2 w-full rounded-xl border border-gray-300 bg-transparent p-3 font-mono uppercase tracking-[.25em] dark:border-gray-700" />
            <button disabled={busy || joinCode.length !== 6 || !hasRemoteApi} onClick={() => run(() => joinBattle(joinCode))} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-300 px-4 py-3 font-bold text-violet-700 disabled:opacity-50 dark:text-violet-300"><Users size={18} /> Join battle</button>
          </section>
        </div>
      </div>
    );
  }

  const me = room.players.find((player) => player.you);
  const winner = room.status === "complete" ? [...room.players].sort((a, b) => b.score - a.score)[0] : null;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-violet-200 bg-violet-50 p-6 dark:border-violet-900 dark:bg-violet-950/30">
        <div><p className="text-xs font-bold uppercase tracking-widest text-violet-600">{room.mode} battle</p><h1 className="mt-1 text-2xl font-black">Room {room.code}</h1></div>
        <button onClick={() => navigator.clipboard?.writeText(room.code)} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-violet-700 shadow-sm dark:bg-gray-900 dark:text-violet-300"><Copy size={16} /> Copy code</button>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">{room.players.map((player) => <div key={player.name} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"><div className="flex items-center justify-between"><span className="font-bold">{player.name}{player.you ? " (You)" : ""}</span>{player.submitted ? <ShieldCheck className="text-emerald-500" /> : <LoaderCircle className="animate-spin text-violet-500" />}</div>{player.score !== null && <p className="mt-2 text-2xl font-black">{player.score}%</p>}</div>)}</div>
      {room.status === "waiting" ? <section className="rounded-3xl border border-dashed border-violet-300 p-12 text-center"><Users className="mx-auto text-violet-500" size={36} /><h2 className="mt-4 text-xl font-extrabold">Waiting for your opponent</h2><p className="mt-2 text-sm text-gray-500">Share code <strong>{room.code}</strong>. This page updates automatically.</p></section> : room.status === "complete" ? <section className="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-10 text-center text-white"><Trophy className="mx-auto" size={44} /><h2 className="mt-4 text-3xl font-black">{room.players[0].score === room.players[1].score ? "Battle drawn" : `${winner.name} wins!`}</h2><button onClick={() => { setRoom(null); setAnswers({}); }} className="mt-6 rounded-xl bg-white px-5 py-3 font-bold text-violet-700">New battle</button></section> : (
        <>
          <div className="space-y-4">{room.questions.map((question, index) => <section key={question.id} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"><p className="text-xs font-bold text-violet-600">QUESTION {index + 1}</p><h2 className="mt-2 font-bold">{question.question}</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{question.options.map((option) => <button key={option} disabled={me?.submitted} onClick={() => { setAnswers((current) => ({ ...current, [question.id]: option })); markDailyQuestionActivity(); }} className={`rounded-xl border p-3 text-left text-sm transition ${answers[question.id] === option ? "border-violet-600 bg-violet-50 font-bold text-violet-700 dark:bg-violet-950/40" : "border-gray-200 dark:border-gray-700"}`}>{option}</button>)}</div></section>)}</div>
          {!me?.submitted ? <button disabled={busy} onClick={() => run(() => submitBattle(room.code, answers))} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-50">Submit battle ({Object.keys(answers).length}/{room.questions.length} answered)</button> : <p className="rounded-2xl bg-emerald-50 p-5 text-center font-bold text-emerald-700">Submitted. Waiting for your opponent...</p>}
        </>
      )}
    </div>
  );
}

export default MockBattles;
