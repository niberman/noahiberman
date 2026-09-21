interface BilingualHeadingProps {
  english: string;
  spanish: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
}

export function BilingualHeading({ 
  english, 
  spanish, 
  className = "", 
  as: Component = "h2" 
}: BilingualHeadingProps) {
  return (
    <div className={className}>
      <Component className="text-4xl md:text-5xl font-display font-normal tracking-[-0.03em] mb-2">
        {english}
      </Component>
      <p className="text-xl md:text-2xl text-ed-light font-display italic">
        {spanish}
      </p>
    </div>
  );
}
