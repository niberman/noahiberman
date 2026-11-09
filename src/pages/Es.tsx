import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { BODY, CARD_TITLE, EYEBROW, H2, INTRO, PageShell } from "@/components/editorial/EditorialPage";
import { Reveal, rise } from "@/components/editorial/fx";

const RATINGS_ES = [
  "Piloto comercial, avión monomotor (ASEL)",
  "Piloto comercial, avión multimotor (AMEL)",
  "Habilitación de vuelo por instrumentos",
  "Piloto privado, helicóptero",
];

const WORK_ES = [
  {
    title: "Plataforma de listas de turno",
    body: "Sistema completo de listas de verificación para restaurantes de servicio rápido. Construido solo. En uso en una franquicia de Smoothie King en Denver.",
  },
  {
    title: "Plataforma de operaciones para escuelas de vuelo",
    body: "Sistema multiempresa para escuelas de vuelo pequeñas: reservas con validación de cumplimiento, motor de averías con puesta en tierra condicional, monitoreo de telemetría y facturación.",
  },
  {
    title: "MockChecker",
    body: "Simulador de exámenes prácticos de la FAA para pilotos, construido con generación aumentada por recuperación sobre los estándares reales de certificación.",
  },
  {
    title: "Hermes",
    body: "Mi propia infraestructura de agentes autónomos, alojada en mis máquinas sobre una red privada, con entrada de voz y resúmenes programados.",
  },
];

const SECTION =
  "grid grid-cols-1 gap-[clamp(16px,3vw,48px)] border-b border-white/[.12] py-[clamp(36px,5vw,72px)] md:grid-cols-[minmax(0,.8fr)_minmax(0,1.5fr)]";
const SECTION_TITLE =
  "text-balance font-editorial font-normal text-[clamp(32px,4vw,60px)] leading-[.95] tracking-[-.03em]";

export default function Es() {
  const navigate = useNavigate();
  return (
    <PageShell lang="es">
      <SEO
        title="Noah Berman | Fundador y piloto comercial en Denver, Colorado"
        description="Noah Berman es fundador de software y piloto comercial de la FAA con habilitaciones de instrumentos, multimotor y helicóptero, basado en Denver, Colorado. Fundador de Aviari LLC. Graduado de la Universidad de Denver."
      />
      <header className="mb-[clamp(48px,7vw,96px)]">
        <p className={`ed-rise mb-[clamp(20px,3vw,32px)] ${EYEBROW}`} style={rise(0.05)}>
          Noah Berman
        </p>
        <h1
          className="ed-rise text-balance font-editorial font-normal text-[clamp(56px,10vw,160px)] leading-[.9] tracking-[-.035em]"
          style={rise(0.15, 1.2)}
        >
          Fundador, Piloto, <em className="text-ed-light">Ingeniero</em>
        </h1>
        <p className={`ed-rise mt-[clamp(20px,3vw,36px)] ${INTRO}`} style={rise(0.4)}>
          El cielo no es el límite
        </p>
        <p
          className="ed-rise mt-2 font-editorial italic text-[clamp(22px,2.6vw,38px)] leading-[1.05] text-ed-muted"
          style={rise(0.55)}
        >
          The sky is not the limit
        </p>
      </header>

      <div className="border-t border-white/[.12]">
        <Reveal as="section" className={SECTION}>
          <h2 className={SECTION_TITLE}>Quién soy</h2>
          <div className="space-y-5">
            <p className={BODY}>
              Soy fundador de Aviari LLC y piloto comercial en Denver, Colorado.
              Construyo software de producción por mi cuenta y trabajo en dos
              idiomas. Me gradué de la Universidad de Denver en junio de 2026,
              con una licenciatura en Computación Aplicada y especializaciones en
              Emprendimiento y Español.
            </p>
            <p className={BODY}>
              Pasé el año 2024-2025 en Bilbao, España, estudiando en la
              Universidad de Deusto y viviendo con una familia local. También he enseñado inglés a
              hispanohablantes adultos, y esa experiencia dentro del aula es la
              base de la tecnología educativa que construyo.
            </p>
          </div>
        </Reveal>

        <Reveal as="section" className={SECTION}>
          <h2 className={SECTION_TITLE}>El vuelo</h2>
          <div>
            <p className={`mb-6 ${BODY}`}>
              Vuelo desde el Aeropuerto Centennial (KAPA). Empecé a volar en
              2021 y no he parado: avión monomotor y multimotor, vuelo por
              instrumentos, helicóptero y vuelo de montaña. Ahora trabajo para
              obtener el certificado de instructor de vuelo (CFI).
            </p>
            <ul className="flex flex-wrap gap-2.5">
              {RATINGS_ES.map((r) => (
                <li
                  key={r}
                  className="rounded-full border border-white/[.14] bg-white/[.02] px-5 py-2.5 font-editorial text-[clamp(17px,1.5vw,21px)] tracking-[-.01em] text-ed-ink"
                >
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal as="section" className={SECTION}>
          <h2 className={SECTION_TITLE}>Lo que he construido</h2>
          <div>
            <div className="border-t border-white/[.08]">
              {WORK_ES.map((item) => (
                <div key={item.title} className="border-b border-white/[.08] py-[clamp(18px,2.4vw,28px)]">
                  <h3 className={`mb-2 ${CARD_TITLE}`}>{item.title}</h3>
                  <p className="text-[15px] font-light leading-[1.6] text-ed-body">{item.body}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={() => navigate("/work")} className="mt-8">
              Ver todo el trabajo (en inglés) <ArrowUpRight />
            </Button>
          </div>
        </Reveal>
      </div>

      <Reveal as="section" className="pt-[clamp(72px,10vw,140px)] text-center">
        <h2 className={H2}>
          <em className="text-ed-light">Contacto</em>
        </h2>
        <p className={`mx-auto mt-6 mb-10 max-w-[520px] ${BODY}`}>
          Trabajo en inglés y en español. Escríbeme en el idioma que prefieras.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={() => navigate("/book")} className="btn-sheen">
            Reservar una reunión
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/")}>
            Versión en inglés
          </Button>
        </div>
      </Reveal>
    </PageShell>
  );
}
