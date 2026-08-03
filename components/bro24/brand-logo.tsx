import Image from "next/image";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3">
    <Image src="/brand/bro24-logo.png" alt="BRO24 Obreros Digitales" width={compact ? 84 : 126} height={compact ? 28 : 42} priority className="h-auto w-auto" />
    {!compact && <span className="hidden text-[10px] font-bold uppercase tracking-[.22em] text-slate-500 sm:block">Obreros Digitales</span>}
  </div>;
}
