import ResumeAnalysisPanel from "../components/ResumeAnalysisPanel";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, Plus, Save, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getAccountStorageKey, readStorage, writeStorage } from "../utils/storage";
import { getRemoteResume, saveRemoteResume } from "../services/resumeService";
import { normalizeResumeDraft, RESUME_SECTIONS, shouldUseRemoteResume } from "../utils/resumeDraft";

const STORAGE_KEY = "prepmentor_resume";
const blankItem = { title: "", subtitle: "", date: "", description: "" };

function ResumeBuilder() {
  const { user, markResumeUploaded } = useAuth();
  const storageKey = getAccountStorageKey(STORAGE_KEY, user);
  const defaultResume = useMemo(() => ({
    name: user?.name || user?.fullName || "", email: user?.email || "", phone: user?.phone || "",
    location: user?.location || "", summary: "", skills: user?.skills || "",
    education: [{ ...blankItem, title: user?.degree || user?.education || "", subtitle: user?.college || "", date: user?.graduationYear || "" }],
    experience: [{ ...blankItem }], projects: [{ ...blankItem }], certifications: [], achievements: [],
  }), [user?.college, user?.degree, user?.education, user?.email, user?.fullName, user?.graduationYear, user?.location, user?.name, user?.phone, user?.skills]);
  const [resume, setResume] = useState(() => normalizeResumeDraft(readStorage(storageKey, null), defaultResume));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loadingRemote, setLoadingRemote] = useState(true);
  const editedWhileLoadingRef = useRef(false);

  useEffect(() => {
    let active = true;
    getRemoteResume()
      .then((remoteResume) => {
        const localDraft = readStorage(storageKey, null);
        if (active && remoteResume && !editedWhileLoadingRef.current && shouldUseRemoteResume(localDraft, remoteResume)) {
          const normalizedResume = normalizeResumeDraft(remoteResume, defaultResume);
          setResume(normalizedResume);
          writeStorage(storageKey, normalizedResume);
        }
      })
      .catch((error) => {
        if (active) setSaveError(`Using your local draft. ${error.message}`);
      })
      .finally(() => {
        if (active) setLoadingRemote(false);
      });
    return () => {
      active = false;
    };
  }, [defaultResume, storageKey]);

  useEffect(() => {
    if (loadingRemote) return undefined;
    const timer = window.setTimeout(() => {
      writeStorage(storageKey, { ...resume, updatedAt: new Date().toISOString() });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [loadingRemote, resume, storageKey]);
  const markEdited = () => {
    if (loadingRemote) editedWhileLoadingRef.current = true;
  };
  const setField = (name, value) => { markEdited(); setResume((current) => ({ ...current, [name]: value })); };
  const setItem = (section, index, name, value) => { markEdited(); setResume((current) => ({ ...current, [section]: current[section].map((item, itemIndex) => itemIndex === index ? { ...item, [name]: value } : item) })); };
  const addItem = (section) => { markEdited(); setResume((current) => ({ ...current, [section]: [...current[section], { ...blankItem }] })); };
  const removeItem = (section, index) => { markEdited(); setResume((current) => ({ ...current, [section]: current[section].filter((_, itemIndex) => itemIndex !== index) })); };
  const save = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const savedResume = await saveRemoteResume(resume);
      writeStorage(storageKey, savedResume);
      setResume(savedResume);
      await markResumeUploaded();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      writeStorage(storageKey, resume);
      setSaveError(`${error.message || "Unable to sync your resume."} Your local draft is safe.`);
    } finally {
      setSaving(false);
    }
  };

  return <div className="resume-print-shell space-y-7"><header data-print-hide className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Resume studio</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Build a resume that reads clearly.</h1><p className="mt-2 text-gray-500 dark:text-gray-400">{loadingRemote?"Loading your saved resume…":"Edit on the left and see the final document update instantly."}</p>{!loadingRemote&&<p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">Changes are cached automatically on this device.</p>}</div><div className="flex gap-3"><button type="button" disabled={saving||loadingRemote} onClick={save} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900"><Save size={17}/>{saving?"Saving…":saved?"Saved":"Save draft"}</button><button type="button" onClick={()=>window.print()} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"><Download size={17}/> Print / PDF</button></div></header>{saveError&&<p data-print-hide role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">{saveError}</p>}
    <ResumeAnalysisPanel resume={resume} loadingDraft={loadingRemote}/><div className="grid items-start gap-6 xl:grid-cols-[0.92fr_1.08fr]"><section data-print-hide className="surface-card space-y-7 rounded-3xl p-6"><FormSection title="Personal details"><div className="grid gap-4 sm:grid-cols-2">{[["name","Full name"],["email","Email"],["phone","Phone"],["location","Location"]].map(([name,label])=><Field key={name} label={label} value={resume[name]} onChange={(value)=>setField(name,value)}/>)}</div><Area label="Professional summary" value={resume.summary} onChange={(value)=>setField("summary",value)}/><Field label="Skills (comma separated)" value={resume.skills} onChange={(value)=>setField("skills",value)}/></FormSection>{RESUME_SECTIONS.map((section)=><FormSection key={section} title={section.charAt(0).toUpperCase()+section.slice(1)} action={<button type="button" onClick={()=>addItem(section)} className="flex items-center gap-1 text-xs font-bold text-indigo-600"><Plus size={15}/> Add</button>}>{resume[section].map((item,index)=><div key={`${section}-${index}`} className="relative grid gap-3 rounded-2xl border border-gray-200 p-4 dark:border-gray-700 sm:grid-cols-2"><Field label="Title" value={item.title} onChange={(value)=>setItem(section,index,"title",value)}/><Field label="Organization / subtitle" value={item.subtitle} onChange={(value)=>setItem(section,index,"subtitle",value)}/><Field label="Date" value={item.date} onChange={(value)=>setItem(section,index,"date",value)}/><button type="button" onClick={()=>removeItem(section,index)} className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${section} item`}><Trash2 size={15}/></button><div className="sm:col-span-2"><Area label="Description" value={item.description} onChange={(value)=>setItem(section,index,"description",value)}/></div></div>)}</FormSection>)}</section>
      <section className="resume-preview sticky top-24"><p data-print-hide className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-500"><Eye size={17}/> Live preview</p><article className="resume-document min-h-[900px] bg-white p-8 text-slate-800 shadow-2xl shadow-slate-900/10 sm:p-12"><header className="border-b-2 border-slate-800 pb-5"><h2 className="text-3xl font-black tracking-tight">{resume.name || "Your Name"}</h2><p className="mt-2 text-sm text-slate-500">{[resume.email,resume.phone,resume.location].filter(Boolean).join("  ·  ") || "email@example.com  ·  Phone  ·  Location"}</p></header>{resume.summary&&<PreviewSection title="Profile"><p>{resume.summary}</p></PreviewSection>}{resume.skills&&<PreviewSection title="Skills"><p>{resume.skills.split(",").map((skill)=>skill.trim()).filter(Boolean).join("  •  ")}</p></PreviewSection>}{RESUME_SECTIONS.map((section)=>{const items=resume[section].filter((item)=>item.title);return items.length?<PreviewSection key={section} title={section}>{items.map((item,index)=><div key={index} className="mb-4"><div className="flex justify-between gap-4"><strong>{item.title}</strong><span className="text-sm text-slate-500">{item.date}</span></div><p className="text-sm font-semibold text-indigo-700">{item.subtitle}</p>{item.description&&<p className="mt-1">{item.description}</p>}</div>)}</PreviewSection>:null;})}</article></section></div></div>;
}

function FormSection({ title, action, children }) { return <div className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2>{action}</div>{children}</div>; }
function Field({ label, value, onChange }) { return <label className="block text-xs font-bold text-gray-500"><span>{label}</span><input value={value || ""} onChange={(event)=>onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-normal text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"/></label>; }
function Area({ label, value, onChange }) { return <label className="block text-xs font-bold text-gray-500"><span>{label}</span><textarea value={value || ""} onChange={(event)=>onChange(event.target.value)} rows="3" className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-normal text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"/></label>; }
function PreviewSection({ title, children }) { return <section className="mt-7"><h3 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">{title}</h3><div className="text-sm leading-6">{children}</div></section>; }

export default ResumeBuilder;
