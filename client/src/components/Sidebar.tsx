import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { createSpring, prefersReducedMotion, project, rubberband, type SpringHandle } from "../lib/spring";
import {
  IconDashboard,
  IconCalculate,
  IconList,
  IconProduct,
  IconFormula,
  IconTag,
  IconUploadFile,
  IconUploadSheet,
  IconHistory,
  IconSettings,
  IconClose,
} from "./icons";

const items = [
  { to: "/", label: "Dashboard", icon: IconDashboard },
  { to: "/calcular", label: "Calcular Color", icon: IconCalculate },
  { to: "/lista", label: "Lista de Costos", icon: IconList },
  { to: "/productos", label: "Productos", icon: IconProduct },
  { to: "/formulas", label: "Fórmulas de Color", icon: IconFormula },
  { to: "/componentes", label: "Costos de Componentes", icon: IconTag },
  { to: "/importar-formulas", label: "Importar Fórmulas", icon: IconUploadFile },
  { to: "/importar-costos", label: "Importar Costos", icon: IconUploadSheet },
  { to: "/historial", label: "Historial", icon: IconHistory },
  { to: "/configuracion", label: "Configuración", icon: IconSettings },
];

const DRAWER_WIDTH = 256; // px — matches w-64

export function Sidebar({
  open,
  onClose,
  closeButtonRef,
}: {
  open: boolean;
  onClose: () => void;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
}) {
  const asideRef = useRef<HTMLElement>(null);
  const springRef = useRef<SpringHandle | null>(null);
  const drag = useRef({ dragging: false, startX: 0, startPos: 0, moved: 0, hist: [] as { t: number; x: number }[] });

  useEffect(() => {
    const el = asideRef.current;
    if (!el) return;
    const spring = createSpring((x) => {
      el.style.transform = `translateX(${x}px)`;
      el.style.visibility = x <= -DRAWER_WIDTH + 1 ? "hidden" : "visible";
    });
    springRef.current = spring;
    spring.jumpTo(-DRAWER_WIDTH);
    return () => spring.stop();
  }, []);

  useEffect(() => {
    const spring = springRef.current;
    if (!spring) return;
    const target = open ? 0 : -DRAWER_WIDTH;
    if (prefersReducedMotion()) {
      spring.jumpTo(target);
    } else {
      spring.goTo(target, { damping: 0.85, response: 0.34 });
    }
  }, [open]);

  function isDraggable() {
    return typeof window !== "undefined" && window.innerWidth < 768; // below md: drawer overlay, not the static desktop rail
  }

  function onPointerDown(e: ReactPointerEvent<HTMLElement>) {
    const spring = springRef.current;
    if (!spring || !isDraggable()) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    spring.stop();
    drag.current = { dragging: true, startX: e.clientX, startPos: spring.getPosition(), moved: 0, hist: [{ t: performance.now(), x: spring.getPosition() }] };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLElement>) {
    const d = drag.current;
    const spring = springRef.current;
    const el = asideRef.current;
    if (!d.dragging || !spring || !el) return;
    const dx = e.clientX - d.startX;
    d.moved = Math.max(d.moved, Math.abs(dx));
    let x = d.startPos + dx;
    if (x > 0) x = rubberband(x, 120);
    else if (x < -DRAWER_WIDTH) x = -DRAWER_WIDTH - rubberband(-DRAWER_WIDTH - x, 120);
    spring.setPosition(x);
    el.style.transform = `translateX(${x}px)`;
    el.style.visibility = "visible";
    d.hist.push({ t: performance.now(), x });
    if (d.hist.length > 6) d.hist.shift();
  }

  function onPointerUp() {
    const d = drag.current;
    const spring = springRef.current;
    if (!d.dragging || !spring) return;
    d.dragging = false;
    if (d.moved < 6) return; // a tap, not a drag — let the click/nav handlers behave normally

    let v = 0;
    if (d.hist.length >= 2) {
      const a = d.hist[0];
      const b = d.hist[d.hist.length - 1];
      const dt = (b.t - a.t) / 1000;
      if (dt > 0) v = (b.x - a.x) / dt;
    }
    const pos = spring.getPosition();
    const projected = pos + project(v);
    const target = Math.abs(projected - 0) < Math.abs(projected - -DRAWER_WIDTH) ? 0 : -DRAWER_WIDTH;
    if (target === -DRAWER_WIDTH) onClose();
    if (prefersReducedMotion()) {
      spring.jumpTo(target);
    } else {
      spring.goTo(target, { damping: 0.85, response: 0.34, velocity: v });
    }
  }

  return (
    <>
      <div
        className={clsx("fixed inset-0 bg-black/40 z-30 md:hidden transition-opacity duration-200 pointer-events-none", open && "opacity-100 pointer-events-auto", !open && "opacity-0")}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={asideRef}
        className="sidebar-drawer glass-dark text-white flex flex-col h-full fixed inset-y-0 left-0 z-40 w-64 shrink-0 md:relative"
        style={{ transform: `translateX(-${DRAWER_WIDTH}px)`, visibility: "hidden", touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="px-5 py-6 border-b border-white/10 flex items-start justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="inline-block w-[9px] h-[9px] rounded-[1px] bg-sky -translate-y-px" aria-hidden="true" />
              <span className="text-lg font-extrabold tracking-tight">Chromascan</span>
            </div>
            <div className="text-xs text-white/60 mt-1.5 leading-snug">Costeo y precios de color · formulación industrial</div>
          </div>
          <button
            ref={closeButtonRef}
            className="md:hidden text-white/70 hover:text-white shrink-0 active:scale-90 transition-transform"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors active:scale-[0.98]",
                  isActive ? "bg-white/15 text-white border-r-4 border-sky" : "text-white/80 hover:bg-white/10 hover:text-white"
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 text-[11px] text-white/50 border-t border-white/10">v0.1 — Datos de demostración incluidos</div>
      </aside>
    </>
  );
}
