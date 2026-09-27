import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ClipboardX, Expand, Maximize, ShieldAlert, ShieldCheck } from "lucide-react";

const violationLabels = {
  "window-blur": "The assessment window lost focus.",
  "tab-hidden": "The assessment tab was hidden.",
  "fullscreen-exit": "Fullscreen mode was exited.",
  "clipboard": "Clipboard actions are disabled during a proctored assessment.",
  "context-menu": "The context menu is disabled during a proctored assessment.",
  "shortcut": "A restricted browser shortcut was used.",
};

function ProctoredAssessment({ children, title = "Assessment", enabled = true, onStarted }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("ready");
  const [cameraError, setCameraError] = useState("");
  const [violations, setViolations] = useState([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [locked, setLocked] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!enabled) {
      stopCamera();
      exitFullscreen();
    }
    return () => {
      stopCamera();
      if (document.fullscreenElement === container) exitFullscreen();
    };
  }, [enabled, exitFullscreen, stopCamera]);

  useEffect(() => {
    if (status !== "active" || !enabled) return undefined;

    const recordViolation = (type) => {
      setViolations((current) => [...current, { type, at: new Date().toISOString() }]);
    };
    const lockForFocusLoss = (type) => {
      recordViolation(type);
      setLocked(true);
      stopCamera();
      exitFullscreen();
    };
    const handleVisibility = () => {
      if (document.hidden) lockForFocusLoss("tab-hidden");
    };
    const handleBlur = () => lockForFocusLoss("window-blur");
    const handleFullscreen = () => {
      const isFullscreen = document.fullscreenElement === containerRef.current;
      setFullscreen(isFullscreen);
      if (!isFullscreen) recordViolation("fullscreen-exit");
    };
    const handleClipboard = (event) => {
      event.preventDefault();
      recordViolation("clipboard");
    };
    const handleContextMenu = (event) => {
      event.preventDefault();
      recordViolation("context-menu");
    };
    const handleShortcut = (event) => {
      const key = event.key.toLowerCase();
      const restricted = event.key === "F12" || ((event.ctrlKey || event.metaKey) && ["c", "v", "x", "u"].includes(key)) || ((event.ctrlKey || event.metaKey) && event.shiftKey && ["i", "j", "c"].includes(key));
      if (restricted) {
        event.preventDefault();
        recordViolation("shortcut");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreen);
    document.addEventListener("copy", handleClipboard);
    document.addEventListener("cut", handleClipboard);
    document.addEventListener("paste", handleClipboard);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleShortcut, true);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreen);
      document.removeEventListener("copy", handleClipboard);
      document.removeEventListener("cut", handleClipboard);
      document.removeEventListener("paste", handleClipboard);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleShortcut, true);
    };
  }, [enabled, exitFullscreen, status, stopCamera]);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [status]);

  const startSession = async () => {
    setStatus("starting");
    setCameraError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser does not support camera-based proctoring.");
      }

      const fullscreenPromise = containerRef.current?.requestFullscreen
        ? containerRef.current.requestFullscreen().catch(() => false)
        : Promise.resolve(false);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      await fullscreenPromise;
      streamRef.current = stream;
      setFullscreen(document.fullscreenElement === containerRef.current);
      setStatus("active");
      onStarted?.();
    } catch (error) {
      stopCamera();
      exitFullscreen();
      setStatus("ready");
      setCameraError(error.name === "NotAllowedError" ? "Camera access is required to start this proctored assessment. Allow camera access and try again." : error.message || "Unable to start camera-based proctoring.");
    }
  };

  const relaunchFullscreen = () => {
    if (!containerRef.current?.requestFullscreen) return;
    containerRef.current.requestFullscreen().then(() => setFullscreen(true)).catch(() => {});
  };

  if (!enabled) return children;

  const lastViolation = violations.at(-1);
  return (
    <div ref={containerRef} className={status === "active" ? "relative min-h-full bg-white dark:bg-gray-950" : "relative"}>
      {status === "ready" || status === "starting" ? (
        <section className="surface-card mx-auto max-w-2xl rounded-3xl p-8 text-center sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><ShieldCheck size={30} /></div>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">Proctored session</p>
          <h1 className="mt-2 text-3xl font-black">{title}</h1>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-gray-500 dark:text-gray-400">This assessment is proctored in practice and Placement mode. Camera video stays in this browser tab and is not recorded or uploaded.</p>
          <div className="mx-auto mt-6 max-w-md space-y-3 text-left text-sm text-gray-600 dark:text-gray-300">
            <p className="flex items-center gap-3"><Camera size={18} className="shrink-0 text-indigo-500" /> Keep your face visible to the camera.</p>
            <p className="flex items-center gap-3"><Maximize size={18} className="shrink-0 text-indigo-500" /> Stay in fullscreen and keep this tab focused.</p>
            <p className="flex items-center gap-3"><ClipboardX size={18} className="shrink-0 text-indigo-500" /> Copy, paste, context menus, and restricted shortcuts are disabled.</p>
          </div>
          {cameraError && <p role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{cameraError}</p>}
          <button type="button" disabled={status === "starting"} onClick={startSession} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"><Camera size={17} />{status === "starting" ? "Starting proctoring…" : "Start proctored assessment"}</button>
        </section>
      ) : (
        <>
          <div className="sticky top-0 z-40 mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200 bg-emerald-50/95 px-4 py-3 text-sm shadow-sm backdrop-blur dark:border-emerald-900 dark:bg-emerald-950/90 sm:px-6">
            <div className="flex items-center gap-3"><span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white"><Camera size={16} /><span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" /></span><span><strong className="block text-emerald-800 dark:text-emerald-200">Proctoring active</strong><span className="text-xs text-emerald-700 dark:text-emerald-300">Camera is local-only · {violations.length} event{violations.length === 1 ? "" : "s"} flagged</span></span></div>
            {!locked && !fullscreen && <button type="button" onClick={relaunchFullscreen} className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"><Expand size={15} /> Resume fullscreen</button>}
          </div>
          {lastViolation && <p role="status" className="mx-auto mb-4 max-w-5xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{violationLabels[lastViolation.type]} This event has been flagged.</p>}
          {!locked && <video ref={videoRef} muted autoPlay playsInline aria-label="Local proctoring camera preview" className="fixed bottom-4 right-4 z-50 h-24 w-32 rounded-xl border-2 border-emerald-500 bg-gray-950 object-cover shadow-xl sm:h-32 sm:w-44" />}
          {children}
          {locked && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/80 p-6 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="proctoring-lock-title"><div className="surface-card max-w-lg rounded-3xl p-8 text-center shadow-2xl"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300"><ShieldAlert size={30} /></div><h2 id="proctoring-lock-title" className="mt-5 text-2xl font-black">Assessment locked</h2><p className="mt-3 leading-7 text-gray-500 dark:text-gray-400">Tab or window switching is not allowed during a proctored assessment. This attempt cannot be resumed.</p><button type="button" onClick={() => window.history.back()} className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">Exit assessment</button></div></div>}
        </>
      )}
    </div>
  );
}

export default ProctoredAssessment;
