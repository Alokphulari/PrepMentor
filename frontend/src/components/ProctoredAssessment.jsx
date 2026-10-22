import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardX, Expand, Maximize, ShieldAlert, ShieldCheck } from "lucide-react";

const violationLabels = {
  "window-blur": "The assessment window lost focus.",
  "tab-hidden": "The assessment tab was hidden.",
  "fullscreen-exit": "Fullscreen mode was exited.",
  "viewport-change": "The assessment window size changed outside fullscreen.",
  clipboard: "Clipboard actions are disabled during a proctored assessment.",
  "context-menu": "The context menu is disabled during a proctored assessment.",
  "drag-drop": "Dragging content into or out of the assessment is disabled.",
  print: "Printing is disabled during a proctored assessment.",
  shortcut: "A restricted browser shortcut was used.",
};

const e2eProctoringBypass = import.meta.env.VITE_E2E_TEST === "true";

function ProctoredAssessment({ children, title = "Assessment", enabled = true, onStarted }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState("ready");
  const [fullscreenError, setFullscreenError] = useState("");
  const [violations, setViolations] = useState([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [locked, setLocked] = useState(false);
  const proctoringEnabled = enabled && !e2eProctoringBypass;

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!proctoringEnabled) exitFullscreen();
    return () => { if (document.fullscreenElement === container) exitFullscreen(); };
  }, [exitFullscreen, proctoringEnabled]);

  useEffect(() => {
    if (status !== "active" || !proctoringEnabled) return undefined;
    const recordViolation = (type) => setViolations((current) => [...current, { type, at: new Date().toISOString() }]);
    const lockForFocusLoss = (type) => { recordViolation(type); setLocked(true); exitFullscreen(); };
    const handleVisibility = () => { if (document.hidden) lockForFocusLoss("tab-hidden"); };
    const handleFullscreen = () => { const active = document.fullscreenElement === containerRef.current; setFullscreen(active); if (!active) lockForFocusLoss("fullscreen-exit"); };
    const handleClipboard = (event) => { event.preventDefault(); recordViolation("clipboard"); };
    const handleContextMenu = (event) => { event.preventDefault(); recordViolation("context-menu"); };
    const handleDragDrop = (event) => { event.preventDefault(); recordViolation("drag-drop"); };
    const handleShortcut = (event) => {
      const key = event.key.toLowerCase();
      const modifier = event.ctrlKey || event.metaKey;
      const restricted = event.key === "F12" || (modifier && ["c", "v", "x", "u", "p", "s"].includes(key)) || (modifier && event.shiftKey && ["i", "j", "c", "k"].includes(key));
      if (restricted) { event.preventDefault(); recordViolation("shortcut"); }
    };
    const handleResize = () => { if (document.fullscreenElement !== containerRef.current) lockForFocusLoss("viewport-change"); };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", () => lockForFocusLoss("window-blur"));
    document.addEventListener("fullscreenchange", handleFullscreen);
    document.addEventListener("copy", handleClipboard); document.addEventListener("cut", handleClipboard); document.addEventListener("paste", handleClipboard);
    document.addEventListener("contextmenu", handleContextMenu); document.addEventListener("dragstart", handleDragDrop); document.addEventListener("drop", handleDragDrop); document.addEventListener("keydown", handleShortcut, true);
    window.addEventListener("beforeprint", () => lockForFocusLoss("print")); window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility); document.removeEventListener("fullscreenchange", handleFullscreen); document.removeEventListener("copy", handleClipboard); document.removeEventListener("cut", handleClipboard); document.removeEventListener("paste", handleClipboard); document.removeEventListener("contextmenu", handleContextMenu); document.removeEventListener("dragstart", handleDragDrop); document.removeEventListener("drop", handleDragDrop); document.removeEventListener("keydown", handleShortcut, true); window.removeEventListener("resize", handleResize);
    };
  }, [exitFullscreen, proctoringEnabled, status]);

  const startSession = async () => {
    setStatus("starting"); setFullscreenError("");
    try {
      if (!containerRef.current?.requestFullscreen) throw new Error("This browser does not support the fullscreen mode required for proctoring.");
      const granted = await containerRef.current.requestFullscreen().then(() => true).catch(() => false);
      if (!granted || document.fullscreenElement !== containerRef.current) throw new Error("Fullscreen access is required. Allow fullscreen and start the assessment again.");
      setFullscreen(true); setStatus("active"); onStarted?.();
    } catch (error) { exitFullscreen(); setStatus("ready"); setFullscreenError(error.message || "Unable to start fullscreen proctoring."); }
  };

  const relaunchFullscreen = () => { if (containerRef.current?.requestFullscreen) containerRef.current.requestFullscreen().then(() => setFullscreen(true)).catch(() => {}); };
  if (!proctoringEnabled) return children;
  const lastViolation = violations.at(-1);
  return <div ref={containerRef} className={status === "active" ? "proctored-assessment relative min-h-full bg-white dark:bg-gray-950" : "relative"}>{status === "ready" || status === "starting" ? <section className="surface-card mx-auto max-w-2xl rounded-3xl p-8 text-center sm:p-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><ShieldCheck size={30} /></div><p className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">Proctored session</p><h1 className="mt-2 text-3xl font-black">{title}</h1><p className="mx-auto mt-4 max-w-xl leading-7 text-gray-500 dark:text-gray-400">This assessment requires fullscreen mode. Tab switching, focus loss, and leaving fullscreen lock the attempt.</p><div className="mx-auto mt-6 max-w-md space-y-3 text-left text-sm text-gray-600 dark:text-gray-300"><p className="flex items-center gap-3"><Maximize size={18} className="shrink-0 text-indigo-500" /> Stay in fullscreen. Tab switching and focus loss lock the attempt.</p><p className="flex items-center gap-3"><ClipboardX size={18} className="shrink-0 text-indigo-500" /> Copy, paste, context menus, and restricted shortcuts are disabled.</p></div>{fullscreenError && <p role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{fullscreenError}</p>}<button type="button" disabled={status === "starting"} onClick={startSession} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"><Maximize size={17} />{status === "starting" ? "Starting proctoring..." : "Start fullscreen assessment"}</button></section> : <><div className="sticky top-0 z-40 mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200 bg-emerald-50/95 px-4 py-3 text-sm shadow-sm backdrop-blur dark:border-emerald-900 dark:bg-emerald-950/90 sm:px-6"><div className="flex items-center gap-3"><span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white"><Maximize size={16} /><span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" /></span><span><strong className="block text-emerald-800 dark:text-emerald-200">Fullscreen proctoring active</strong><span className="text-xs text-emerald-700 dark:text-emerald-300">Tab and focus monitoring · {violations.length} event{violations.length === 1 ? "" : "s"} flagged</span></span></div>{!locked && !fullscreen && <button type="button" onClick={relaunchFullscreen} className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800"><Expand size={15} /> Resume fullscreen</button>}</div>{lastViolation && <p role="status" className="mx-auto mb-4 max-w-5xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{violationLabels[lastViolation.type]} This event has been flagged.</p>}{children}{locked && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/80 p-6 backdrop-blur-sm" role="alertdialog" aria-modal="true"><div className="surface-card max-w-lg rounded-3xl p-8 text-center shadow-2xl"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600"><ShieldAlert size={30} /></div><h2 className="mt-5 text-2xl font-black">Assessment locked</h2><p className="mt-3 leading-7 text-gray-500">{lastViolation ? violationLabels[lastViolation.type] : "A proctoring rule was violated."} This attempt cannot be resumed.</p><button type="button" onClick={() => window.history.back()} className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">Exit assessment</button></div></div>}</>}
  </div>;
}

export default ProctoredAssessment;
