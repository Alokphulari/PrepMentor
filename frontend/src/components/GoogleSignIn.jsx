import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest, hasRemoteApi } from "../services/api";

export default function GoogleSignIn() {
  const holder = useRef(null);
  const { googleSignIn } = useAuth();
  const callback = useRef(googleSignIn);
  useEffect(() => { callback.current = googleSignIn; }, [googleSignIn]);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  useEffect(() => {
    if (!hasRemoteApi) return;
    let active = true;
    let script;
    apiRequest("/api/health").then(({ googleClientId }) => {
      if (!active || !googleClientId) return;
      const frontendClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
      if (frontendClientId && frontendClientId !== googleClientId) { setError("Google sign-in configuration does not match the server. Use email and password."); return; }
      const initialize = () => {
        if (!active || !holder.current || !window.google?.accounts) return;
        window.google.accounts.id.initialize({ client_id: googleClientId, callback: async ({ credential }) => {
          try { const user = await callback.current(credential); navigate(user.profileCompleted ? "/dashboard" : "/complete-profile"); }
          catch (failure) { if (active) setError(failure.message); }
        } });
        window.google.accounts.id.renderButton(holder.current, { theme: "outline", size: "large" });
      };
      if (window.google?.accounts) initialize();
      else { script = document.createElement("script"); script.src = "https://accounts.google.com/gsi/client"; script.async = true; script.onload = initialize; script.onerror = () => { if (active) setError("Google sign-in could not load. Use email and password."); }; document.head.appendChild(script); }
    }).catch(() => {});
    return () => { active = false; script?.remove(); };
  }, [navigate]);
  return <div className="mt-5"><div ref={holder} />{error && <p role="alert" className="mt-2 text-sm text-rose-500">{error}</p>}</div>;
}
