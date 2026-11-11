import { Globe } from "lucide-react";
import { useState } from "react";

const LOGO_URL = "https://lh3.googleusercontent.com/d/1L4iFSjVY8BNFyga4lHmUnzjdi6yBpExa";

/**
 * BrandLogo — renders the hosted Fortune World Tour logo.
 * onError fallback ensures the build never crashes and never shows a broken image.
 */
export function BrandLogo({ className = "h-8 md:h-9" }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <img
        src={LOGO_URL}
        alt="Fortune World Tour"
        className={`${className} w-auto object-contain`}
        onError={(e) => {
          e.currentTarget.style.display = "none";
          setFailed(true);
        }}
      />
    );
  }

  /* ── Inline fallback: styled text badge ── */
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#222468] to-[#1a1c54] shadow-lg">
        <Globe className="h-5 w-5 text-[#EA7218]" />
      </span>
      <div>
        <p className="font-display text-[14px] font-bold leading-none tracking-tight text-[#222468]">
          F<span className="text-[#EA7218]">O</span>RTUNE
        </p>
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#222468]/60">
          World Tour
        </p>
      </div>
    </div>
  );
}

/** Compact single-line variant for drawers and quote headers */
export function BrandLogoCompact() {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <img
        src={LOGO_URL}
        alt="Fortune World Tour"
        className="h-7 w-auto rounded-md border border-zinc-100 bg-white p-1 object-contain"
        onError={(e) => {
          e.currentTarget.style.display = "none";
          setFailed(true);
        }}
      />
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <Globe className="h-4 w-4 text-[#EA7218]" />
      <span className="font-display text-[12px] font-bold tracking-tight text-zinc-900">
        Fortune World Tour
      </span>
    </span>
  );
}
