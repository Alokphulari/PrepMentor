const sizes = {
  sm: "h-5 w-5 border-2",
  md: "h-9 w-9 border-4",
  lg: "h-12 w-12 border-4",
};

function Loader({ label = "Loading", size = "md", fullScreen = false }) {
  const spinner = <div className={`${sizes[size] || sizes.md} animate-spin rounded-full border-indigo-200 border-t-indigo-600 dark:border-indigo-950 dark:border-t-indigo-400`} aria-hidden="true" />;

  if (fullScreen) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 dark:bg-gray-950" role="status" aria-live="polite"><div className="flex flex-col items-center gap-3">{spinner}<span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{label}</span></div></div>;
  }

  return <span className="inline-flex items-center gap-2" role="status" aria-live="polite">{spinner}<span className="sr-only">{label}</span></span>;
}

export default Loader;
