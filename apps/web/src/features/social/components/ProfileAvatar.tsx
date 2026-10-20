"use client";

import { useEffect, useState } from "react";
import type { AudiqProfile } from "@/features/auth/AuthProvider";

export default function ProfileAvatar({
  profile,
  className = "h-11 w-11",
}: {
  profile: Pick<AudiqProfile, "display_name" | "avatar_color" | "avatar_style" | "avatar_url"> | null;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const avatarUrl = profile?.avatar_url ?? null;

  useEffect(() => setImageFailed(false), [avatarUrl]);

  if (avatarUrl && !imageFailed) {
    return (
      <img
        src={avatarUrl}
        alt={`${profile?.display_name || "Audiq user"} profile photo`}
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className={`${className} shrink-0 rounded-full border border-white/10 object-cover shadow-sm`}
      />
    );
  }

  const style = profile?.avatar_style ?? "neutral";
  const hair = style === "feminine"
    ? "M18 34c0-14 6-22 14-22s14 8 14 22c-3-4-6-6-10-7-3 5-10 8-18 9Z"
    : style === "masculine"
      ? "M20 29c0-12 5-18 12-18s12 6 12 18c-4-4-8-6-12-6s-8 2-12 6Z"
      : "M19 29c0-12 5-18 13-18 7 0 12 6 12 18-4-3-7-5-11-5-5 0-9 2-14 5Z";

  return (
    <span
      role="img"
      aria-label={`${profile?.display_name || "Audiq user"} illustrated profile avatar`}
      className={`${className} relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 shadow-sm`}
      style={{ background: `radial-gradient(circle at 30% 18%, #29453d 0%, ${profile?.avatar_color || "#0e7b69"} 48%, #07100d 100%)` }}
    >
      <svg viewBox="0 0 64 64" aria-hidden="true" className="h-full w-full">
        <path d="M8 64c2-13 10-20 24-20s22 7 24 20H8Z" fill="#d6ff36" />
        <path d="M27 38h10v12H27z" fill="#bd775c" />
        <ellipse cx="32" cy="29" rx="13" ry="16" fill="#f2b992" />
        <path d={hair} fill="#17201c" />
        <path d="M25 31h2m10 0h2" stroke="#17201c" strokeWidth="2" strokeLinecap="round" />
        <path d="M29 38c2 2 4 2 6 0" fill="none" stroke="#9d4f45" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 54c5-4 10-7 16-9l8 9 8-9c6 2 11 5 16 9v10H8V54Z" fill="#0d2924" />
        <path d="M23 46c2 5 5 8 9 8s7-3 9-8" fill="none" stroke="#d6ff36" strokeWidth="2" />
      </svg>
    </span>
  );
}

