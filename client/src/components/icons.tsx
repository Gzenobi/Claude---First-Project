// Set de íconos propio (línea, un solo color = currentColor), en reemplazo
// de los emoji que se usaban antes. Un emoji no es un ícono de marca: trae
// su propio color/estilo fuera de la paleta y no escala con nitidez.
// Regla de la guía AkzoNobel: "un solo color sólido por ícono, formas simples".

type IconProps = { className?: string };
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function IconDashboard({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13" y="3.5" width="7.5" height="4.5" rx="1.5" />
      <rect x="13" y="10" width="7.5" height="10.5" rx="1.5" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5" />
    </svg>
  );
}

export function IconCalculate({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4.5" y="3" width="15" height="18" rx="2" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="12" x2="8" y2="12.01" />
      <line x1="12" y1="12" x2="12" y2="12.01" />
      <line x1="16" y1="12" x2="16" y2="12.01" />
      <line x1="8" y1="16" x2="8" y2="16.01" />
      <line x1="12" y1="16" x2="12" y2="16.01" />
      <line x1="16" y1="16" x2="16" y2="16.01" />
    </svg>
  );
}

export function IconList({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <path d="M4.5 5.5l1 1 2-2" />
      <path d="M4.5 11.5l1 1 2-2" />
      <path d="M4.5 17.5l1 1 2-2" />
    </svg>
  );
}

export function IconProduct({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3l7.5 4.3v9.4L12 21l-7.5-4.3V7.3L12 3z" />
      <path d="M4.5 7.3L12 11.6l7.5-4.3" />
      <line x1="12" y1="11.6" x2="12" y2="21" />
    </svg>
  );
}

export function IconFormula({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9.5 3h5" />
      <path d="M10.5 3v6l-5 9.2c-.6 1 .1 2.3 1.3 2.3h10.4c1.2 0 1.9-1.3 1.3-2.3l-5-9.2V3" />
      <line x1="7.5" y1="15" x2="16.5" y2="15" />
    </svg>
  );
}

export function IconTag({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12.6 3.5H6a1 1 0 00-1 1v6.6a1 1 0 00.3.7l9.2 9.2a1 1 0 001.4 0l6.6-6.6a1 1 0 000-1.4l-9.2-9.2a1 1 0 00-.7-.3z" />
      <line x1="9" y1="9" x2="9" y2="9.01" />
    </svg>
  );
}

export function IconUploadFile({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M13 3H7a1.5 1.5 0 00-1.5 1.5v15A1.5 1.5 0 007 21h10a1.5 1.5 0 001.5-1.5V8.5L13 3z" />
      <path d="M13 3v5.5h5.5" />
      <line x1="12" y1="12" x2="12" y2="17.5" />
      <path d="M9.5 14.5L12 12l2.5 2.5" />
    </svg>
  );
}

export function IconUploadSheet({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <line x1="4" y1="9.5" x2="20" y2="9.5" />
      <line x1="9.5" y1="9.5" x2="9.5" y2="20" />
      <path d="M14.5 17l2-2 2 2" />
      <line x1="16.5" y1="15" x2="16.5" y2="20" />
    </svg>
  );
}

export function IconHistory({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="13" r="8" />
      <polyline points="12,9 12,13 15,15" />
      <path d="M6 4.5L4 7" />
      <path d="M18 4.5L20 7" />
    </svg>
  );
}

export function IconSettings({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M4.9 6.1l1.55 1.55M17.55 16.35l1.55 1.55M3 12h2.2M18.8 12H21M4.9 17.9l1.55-1.55M17.55 7.65l1.55-1.55" />
    </svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <line x1="20" y1="20" x2="15.8" y2="15.8" />
    </svg>
  );
}

export function IconCloudUpload({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M7 18a4.5 4.5 0 01-.8-8.94A5.5 5.5 0 0117 8.02 4 4 0 0117 16" />
      <line x1="12" y1="11" x2="12" y2="19" />
      <path d="M9 13.5L12 11l3 2.5" />
    </svg>
  );
}
