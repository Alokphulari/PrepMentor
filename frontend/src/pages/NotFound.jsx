import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "react-router-dom";

function NotFound() {
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 dark:bg-gray-950"><div className="max-w-lg text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Compass size={30} /></div><p className="mt-6 text-sm font-black uppercase tracking-[0.22em] text-indigo-600">Error 404</p><h1 className="mt-3 text-4xl font-black tracking-tight text-gray-950 dark:text-white sm:text-5xl">This path needs a new direction.</h1><p className="mt-4 leading-7 text-gray-500 dark:text-gray-400">The page may have moved, or the address may be incomplete. Your preparation progress is safe.</p><Link to="/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-indigo-700"><ArrowLeft size={17} /> Back to dashboard</Link></div></main>;
}

export default NotFound;
