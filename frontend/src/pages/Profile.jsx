import { useState } from "react";
import { Check, MapPin, Save, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const fields = [
  ["name", "Full name", "text"], ["email", "Email address", "email"],
  ["phone", "Phone", "tel"], ["location", "Location", "text"],
  ["college", "College / university", "text"], ["education", "Degree", "text"],
  ["graduationYear", "Graduation year", "number"], ["targetRole", "Target role", "text"],
];

function Profile() {
  const { user, completeProfile } = useAuth();
  const [form, setForm] = useState({
    ...user,
    name: user?.name || user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    location: user?.location || "",
    college: user?.college || "",
    education: user?.education || user?.degree || "",
    graduationYear: user?.graduationYear || "",
    targetRole: user?.targetRole || user?.careerInterests || "",
    skills: user?.skills || "",
    bio: user?.bio || "",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const update = ({ target }) => setForm((value) => ({ ...value, [target.name]: target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaveError("");
    try {
      await completeProfile(form);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (error) {
      setSaveError(error.message || "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Your profile</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Make every session relevant.</h1><p className="mt-2 max-w-2xl text-gray-500 dark:text-gray-400">Your background helps PrepMentor tailor practice and interview questions.</p></div>
        {saved && <span className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><Check size={17} /> Changes saved</span>}
      </header>

      <form onSubmit={submit} className="surface-card overflow-hidden rounded-3xl">
        <div className="flex flex-col gap-5 border-b border-gray-200 p-6 dark:border-gray-800 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-100 text-2xl font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{(form.name || "S").charAt(0).toUpperCase()}</div>
          <div><h2 className="text-xl font-bold">{form.name || "Your name"}</h2><p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500"><MapPin size={15} /> {form.location || "Add your location"}</p><span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"><UserRound size={13} /> Student profile</span></div>
        </div>
        <div className="grid gap-5 p-6 sm:grid-cols-2 lg:p-8">
          {fields.map(([name, label, type]) => <label key={name} className="space-y-2 text-sm font-semibold text-gray-700 dark:text-gray-300"><span>{label}</span><input name={name} type={type} value={form[name] || ""} onChange={update} readOnly={name === "email"} aria-describedby={name === "email" ? "profile-email-note" : undefined} className={`w-full rounded-xl border px-4 py-3 font-normal outline-none transition dark:border-gray-700 ${name === "email" ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" : "border-gray-200 bg-white text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:bg-gray-900 dark:text-white"}`} />{name === "email"&&<small id="profile-email-note" className="block font-normal text-gray-400">Email is managed by your sign-in account.</small>}</label>)}
          <label className="space-y-2 text-sm font-semibold text-gray-700 dark:text-gray-300 sm:col-span-2"><span>Skills <span className="font-normal text-gray-400">(comma separated)</span></span><input name="skills" value={form.skills || ""} onChange={update} placeholder="JavaScript, React, Data Structures" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-normal dark:border-gray-700 dark:bg-gray-900" /></label>
          <label className="space-y-2 text-sm font-semibold text-gray-700 dark:text-gray-300 sm:col-span-2"><span>Professional bio</span><textarea name="bio" value={form.bio || ""} onChange={update} rows="4" placeholder="A short introduction about your goals and experience…" className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 font-normal dark:border-gray-700 dark:bg-gray-900" /></label>
        </div>
        {saveError&&<p role="alert" className="mx-6 mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{saveError}</p>}<div className="flex justify-end border-t border-gray-200 bg-gray-50/70 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/50"><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"><Save size={17} /> {saving?"Saving…":"Save profile"}</button></div>
      </form>
    </div>
  );
}

export default Profile;
