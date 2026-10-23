import { ChevronRight } from 'lucide-react';

export function Sentido({ origem, destino }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {origem}<ChevronRight className="size-3.5 shrink-0" aria-label="sentido" />{destino}
    </span>
  );
}
