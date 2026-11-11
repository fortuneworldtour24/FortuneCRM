import { useState } from "react";
import { cn, initials, PRESENCE_DOT } from "@/lib/utils";
import type { Profile } from "@/types/database";

const SIZES = {
  xs: "h-5 w-5 text-[8px]",
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-[11px]",
  lg: "h-11 w-11 text-[13px]",
} as const;

export function Avatar({
  person,
  size = "md",
  showStatus = false,
  dark = false,
  className,
}: {
  person: Pick<Profile, "full_name" | "avatar_color" | "status"> & { avatar_url?: string };
  size?: keyof typeof SIZES;
  showStatus?: boolean;
  dark?: boolean;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const hasPhoto = !!person.avatar_url && !imgError;

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {hasPhoto ? (
        <img
          src={person.avatar_url}
          alt={person.full_name}
          onError={() => setImgError(true)}
          className={cn(
            "rounded-full object-cover",
            SIZES[size],
            dark ? "ring-2 ring-zinc-700" : "ring-2 ring-white"
          )}
        />
      ) : (
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white",
            person.avatar_color,
            SIZES[size],
            dark ? "ring-2 ring-zinc-700" : "ring-2 ring-white"
          )}
        >
          {initials(person.full_name)}
        </span>
      )}
      {showStatus && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2",
            PRESENCE_DOT[person.status],
            dark ? "ring-zinc-900" : "ring-white"
          )}
        />
      )}
    </span>
  );
}
