import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { scrollToId } from "@/lib/lenis-ref";

interface SectionRedirectProps {
  sectionId: string;
}

export function SectionRedirect({ sectionId }: SectionRedirectProps) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/", { replace: true });
    setTimeout(() => scrollToId(sectionId), 100);
  }, [navigate, sectionId]);

  return null;
}



