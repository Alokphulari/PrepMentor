import Loader from "./Loader";

const variants = {
  primary: "bg-indigo-600 text-white shadow-lg shadow-indigo-600/15 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400",
  secondary: "border border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-indigo-600 dark:hover:text-indigo-300",
  danger: "bg-rose-600 text-white shadow-lg shadow-rose-600/15 hover:bg-rose-700",
  ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
};

const sizes = {
  sm: "min-h-9 rounded-lg px-3 py-2 text-xs",
  md: "min-h-11 rounded-xl px-4 py-2.5 text-sm",
  lg: "min-h-12 rounded-xl px-5 py-3 text-sm",
};

function Button({ children, variant = "primary", size = "md", loading = false, loadingLabel = "Working", fullWidth = false, leftIcon, rightIcon, className = "", disabled, type = "button", ...props }) {
  return <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={`inline-flex items-center justify-center gap-2 font-bold transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${fullWidth ? "w-full" : ""} ${className}`} {...props}>{loading ? <><Loader size="sm" label=""/><span>{loadingLabel}</span></> : <>{leftIcon}{children}{rightIcon}</>}</button>;
}

export default Button;
