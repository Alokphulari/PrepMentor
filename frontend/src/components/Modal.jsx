import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const widths = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
};

const focusableSelector = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

function Modal({ open, onClose, title, description, children, footer, size = "md", closeOnBackdrop = true }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      const firstControl = panelRef.current?.querySelector(focusableSelector);
      (firstControl || panelRef.current)?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current?.();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const controls = [...panelRef.current.querySelectorAll(focusableSelector)];
      if (!controls.length) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (closeOnBackdrop && event.target === event.currentTarget) onClose?.(); }}>
      <section ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} aria-describedby={description ? descriptionId : undefined} className={`w-full ${widths[size] || widths.md} max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-2xl shadow-gray-950/25 outline-none dark:border-gray-700 dark:bg-gray-900`}>
        <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800"><div>{title&&<h2 id={titleId} className="text-xl font-extrabold tracking-tight">{title}</h2>}{description&&<p id={descriptionId} className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p>}</div><button type="button" onClick={onClose} className="shrink-0 rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200" aria-label="Close dialog"><X size={19}/></button></header>
        <div className="px-6 py-5">{children}</div>
        {footer&&<footer className="flex flex-wrap justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">{footer}</footer>}
      </section>
    </div>,
    document.body
  );
}

export default Modal;
