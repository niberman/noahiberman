import { H2 } from "@/components/editorial/EditorialPage";

interface BilingualHeadingProps {
  english: string;
  spanish: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
}

/** Editorial section heading: the H2 display scale with its Spanish echo in
 *  light-purple italic, as on Aviation and Now. */
export function BilingualHeading({
  english,
  spanish,
  className = "",
  as: Component = "h2"
}: BilingualHeadingProps) {
  return (
    <div className={className}>
      <Component className={`${H2} text-balance`}>
        {english}
      </Component>
      <p className="mt-[clamp(14px,2vw,24px)] font-editorial italic text-[clamp(24px,3vw,44px)] leading-none text-ed-light">
        {spanish}
      </p>
    </div>
  );
}
