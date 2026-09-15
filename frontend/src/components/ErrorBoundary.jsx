import { Component } from "react";
import { Home, RefreshCw, ShieldAlert } from "lucide-react";
import Button from "./Button";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, details) {
    console.error("PrepMentor render failure:", error, details);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12 text-gray-950 dark:bg-gray-950 dark:text-white"><section className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-2xl shadow-gray-900/10 dark:border-gray-800 dark:bg-gray-900 sm:p-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"><ShieldAlert size={29}/></div><p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-rose-500">Recovery mode</p><h1 className="mt-3 text-3xl font-black tracking-tight">PrepMentor hit an unexpected problem.</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">Your saved account data and progress have not been cleared. Reload the workspace, or return to the dashboard with a fresh page state.</p>{import.meta.env.DEV&&<pre className="mt-5 max-h-28 overflow-auto rounded-xl bg-gray-950 p-3 text-left text-xs text-rose-300">{this.state.error.message}</pre>}<div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Button variant="secondary" size="lg" onClick={()=>window.location.reload()} leftIcon={<RefreshCw size={17}/>}>Reload workspace</Button><Button size="lg" onClick={()=>window.location.assign("/dashboard")} leftIcon={<Home size={17}/>}>Open dashboard</Button></div></section></main>;
  }
}

export default ErrorBoundary;
