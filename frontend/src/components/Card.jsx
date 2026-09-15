const paddings = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

function Card({ as: Element = "section", children, padding = "md", interactive = false, className = "", ...props }) {
  return <Element className={`surface-card rounded-3xl ${paddings[padding] || paddings.md} ${interactive ? "interactive-card" : ""} ${className}`} {...props}>{children}</Element>;
}

export default Card;
