import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface SectionRedirectProps {
  sectionId: string;
}

export function SectionRedirect({ sectionId }: SectionRedirectProps) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/", { replace: true });
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  }, [navigate, sectionId]);

  return null;
}

