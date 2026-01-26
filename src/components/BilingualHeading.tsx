interface BilingualHeadingProps {
  english: string;
  spanish: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
  variant?: "default" | "compact";
}

export function BilingualHeading({ 
  english, 
  spanish, 
  className = "", 
  as: Component = "h2",
  variant = "default",
}: BilingualHeadingProps) {
  const isCompact = variant === "compact";
  return (
    <div className={className}>
      <Component
        className={
          isCompact
            ? "text-3xl font-bold mb-2"
            : "text-4xl md:text-5xl font-bold mb-2"
        }
      >
        {english}
      </Component>
      <p
        className={
          isCompact
            ? "text-xl text-secondary font-display italic"
            : "text-xl md:text-2xl text-secondary font-display italic"
        }
      >
        {spanish}
      </p>
    </div>
  );
}
