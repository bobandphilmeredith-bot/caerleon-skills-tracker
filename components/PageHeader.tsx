"use client";

import { useSchoolSettings } from "@/lib/schoolSettings";

export function PageHeader({
  eyebrow,
  title,
  description,
  accent = "#741B47"
}: {
  eyebrow: string;
  title: string;
  description: string;
  accent?: string;
}) {
  const { settings } = useSchoolSettings();
  return (
    <header className="flex max-w-5xl items-start gap-4">
      <div className="hidden h-16 w-16 shrink-0 place-items-center rounded-md border border-gray-200 bg-white p-1.5 shadow-sm sm:grid">
        <img src={settings.branding.logoDataUrl} alt="" className="h-full w-full object-contain" />
      </div>
      <div>
        <div className="text-sm font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
          {eyebrow}
        </div>
        <h1 className="mt-2 text-3xl font-bold text-gray-950 sm:text-4xl">{title}</h1>
        <p className="mt-3 text-base leading-7 text-gray-600">{description}</p>
      </div>
    </header>
  );
}
