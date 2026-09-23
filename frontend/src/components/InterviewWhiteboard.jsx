import { useEffect, useRef, useState } from "react";
import { ChevronDown, Eraser, Pencil, RotateCcw } from "lucide-react";
import InterviewAvatar from "./InterviewAvatar";

function InterviewWhiteboard({ storageKey }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#1f2937");

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    let restoredImage;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (!saved) return;
      const image = new Image();
      restoredImage = image;
      image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.src = saved;
    } catch {
      // Drawing remains available even if tab storage is denied.
    }
    return () => { if (restoredImage) restoredImage.onload = null; drawingRef.current = false; };
  }, [open, storageKey]);

  const point = (event) => {
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    };
  };

  const begin = (event) => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    drawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = point(event);
    context.beginPath();
    context.moveTo(start.x, start.y);
  };

  const draw = (event) => {
    if (!drawingRef.current) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const next = point(event);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = tool === "eraser" ? 22 : 3;
    context.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    context.lineTo(next.x, next.y);
    context.stroke();
  };

  const save = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try {
      sessionStorage.setItem(storageKey, canvasRef.current.toDataURL("image/png"));
    } catch {
      // The current drawing remains usable without persistence.
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // Clearing the visible canvas is still sufficient.
    }
  };

  return <><InterviewAvatar/><section className="mt-7 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
    <button type="button" onClick={()=>setOpen((value)=>!value)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 bg-gray-50 px-4 py-3.5 text-left dark:bg-gray-800/60"><span><span className="flex items-center gap-2 text-sm font-extrabold"><Pencil size={17} className="text-indigo-500"/> Rough-work whiteboard</span><span className="mt-1 block text-xs text-gray-500">Sketch an approach, diagram, or calculation without affecting your answer.</span></span><ChevronDown size={18} className={`shrink-0 text-gray-400 transition-transform ${open?"rotate-180":""}`}/></button>
    {open&&<div className="bg-gray-100 p-3 dark:bg-gray-950 sm:p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><button type="button" onClick={()=>setTool("pen")} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${tool==="pen"?"bg-indigo-600 text-white":"bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-200"}`}><Pencil size={14}/> Pen</button><button type="button" onClick={()=>setTool("eraser")} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${tool==="eraser"?"bg-indigo-600 text-white":"bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-200"}`}><Eraser size={14}/> Eraser</button>{["#1f2937","#2563eb","#dc2626","#16a34a"].map((value)=><button key={value} type="button" onClick={()=>{setColor(value);setTool("pen");}} aria-label={`Use ${value} pen`} className={`h-7 w-7 rounded-full border-2 border-white shadow ring-offset-2 ${color===value&&tool==="pen"?"ring-2 ring-indigo-500":""}`} style={{backgroundColor:value}}/>)}</div><button type="button" onClick={clear} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-rose-600 dark:bg-gray-800"><RotateCcw size={14}/> Clear</button></div><canvas ref={canvasRef} width="900" height="420" onPointerDown={begin} onPointerMove={draw} onPointerUp={save} onPointerCancel={save} onPointerLeave={save} aria-label="Interview rough-work drawing canvas" className="aspect-[15/7] w-full touch-none rounded-xl bg-white shadow-inner cursor-crosshair"/></div>}
  </section></>;
}

export default InterviewWhiteboard;
