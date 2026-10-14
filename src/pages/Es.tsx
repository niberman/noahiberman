import { m } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import { ROUTE_META } from "@/data/routeMeta";
import { Button } from "@/components/ui/button";

const RATINGS_ES = [
  "Piloto comercial, avión monomotor (ASEL)",
  "Piloto comercial, avión multimotor (AMEL)",
  "Habilitación de vuelo por instrumentos",
  "Piloto privado, helicóptero",
];

const WORK_ES = [
  {
    title: "Plataforma de operaciones de aviación",
    body: "Plataforma multiempresa para escuelas de vuelo y FBO: programación, estado de las aeronaves, mantenimiento y facturación. Deja la aeronave en tierra cuando los datos del motor salen de los límites del fabricante.",
  },
  {
    title: "Briefing automático antes del vuelo",
    body: "Servicio en Python que reúne el tiempo y los NOTAM de un vuelo y envía el briefing al teléfono. El peso y balance se calcula con código determinista, no con un modelo de lenguaje.",
  },
  {
    title: "Portal para propietarios de aeronaves",
    body: "Portal de programación y facturación para Freedom Aviation, usado por propietarios, instructores y mecánicos.",
  },
  {
    title: "Lista de verificación por turno",
    body: "Aplicación construida solo. En uso en tiendas de Smoothie King en Denver.",
  },
];

export default function Es() {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen bg-background pt-24 sm:pt-28 pb-20 px-4 sm:px-6" lang="es">
      <SEO title={ROUTE_META["/es"].title} description={ROUTE_META["/es"].description} />
      <div className="container mx-auto max-w-3xl">
        <m.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-lg sm:text-xl font-display text-secondary mb-2">Noah Berman</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-normal mb-4 text-primary-foreground leading-tight">
            Piloto, Ingeniero de software
          </h1>
          <p className="text-xl sm:text-2xl text-primary-foreground/95 font-light mb-2">
            Software de aviación, hecho por un piloto.
          </p>
          <p className="text-lg text-ed-light font-display italic mb-10">
            Aviation software, built by a pilot.
          </p>
        </m.div>

        <m.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="font-display font-normal text-3xl tracking-[-0.02em] text-primary-foreground mb-4">Quién soy</h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            Soy ingeniero de software y piloto comercial en Denver, Colorado.
            Construyo software para la aviación y trabajo en inglés y en
            español. Me gradué de la Universidad de Denver en junio de 2026,
            con una licenciatura en Computación Aplicada y especializaciones en
            Emprendimiento y Español. Busco un puesto de tiempo completo en
            software de aviación o aeroespacial, en Boulder, San Francisco o en
            el extranjero.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            Pasé el año 2024-2025 en Bilbao, España, estudiando en la
            Universidad de Deusto y viviendo con una familia local. También
            enseñé inglés y español a adultos en The Language School.
          </p>
        </m.section>

        <m.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="font-display font-normal text-3xl tracking-[-0.02em] text-primary-foreground mb-4">El vuelo</h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            Vuelo desde el Aeropuerto Centennial (KAPA). Empecé a volar en
            2021: avión monomotor y multimotor, vuelo por instrumentos,
            helicóptero y vuelo de montaña. Ahora trabajo para
            obtener el certificado de instructor de vuelo (CFI).
          </p>
          <ul className="space-y-2">
            {RATINGS_ES.map((r) => (
              <li key={r} className="flex items-start gap-3 text-foreground/85">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-secondary shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </m.section>

        <m.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="font-display font-normal text-3xl tracking-[-0.02em] text-primary-foreground mb-4">
            Lo que he construido
          </h2>
          <div className="space-y-4">
            {WORK_ES.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border/50 bg-card/50 p-5 shadow-elegant"
              >
                <h3 className="font-semibold text-primary-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate("/work")}
            className="mt-4 text-secondary"
          >
            Ver todo el trabajo (en inglés) <ArrowUpRight className="ml-1 h-4 w-4" />
          </Button>
        </m.section>

        <m.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-xl border border-border/50 bg-card/50 p-6 sm:p-8 text-center shadow-elegant"
        >
          <h2 className="text-2xl font-display font-normal text-primary-foreground mb-2">Contacto</h2>
          <p className="text-muted-foreground mb-5">
            Trabajo en inglés y en español. Escríbame en el idioma que prefiera.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => navigate("/book")}
              className="btn-sheen bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full px-8"
            >
              Reservar una reunión
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/resume")}
              className="rounded-full px-8"
            >
              Currículum (en inglés)
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="rounded-full px-8"
            >
              Versión en inglés
            </Button>
          </div>
        </m.section>
      </div>
    </main>
  );
}
