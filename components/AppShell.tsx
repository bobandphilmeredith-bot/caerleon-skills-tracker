"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { areaThemes, themeForFramework } from "@/lib/theme";
import { useSchoolSettings } from "@/lib/schoolSettings";

const navGroups = [
  {
    title: "Dashboards",
    items: [
      { href: "/", label: "Whole School", icon: "WS", theme: areaThemes.overview },
      { href: "/literacy", label: "Literacy", icon: "Li", theme: themeForFramework("Literacy") },
      { href: "/numeracy", label: "Numeracy", icon: "Nu", theme: themeForFramework("Numeracy") },
      { href: "/dcf", label: "DCF", icon: "DC", theme: themeForFramework("Digital Competence Framework") },
      { href: "/themes", label: "Themes", icon: "CT", theme: themeForFramework("Cross-cutting Themes") }
    ]
  },
  {
    title: "Explore",
    items: [
      { href: "/curriculum-explorer", label: "Curriculum Explorer", icon: "CE", theme: areaThemes.overview },
      { href: "/progression-overview", label: "Progression Overview", icon: "PO", theme: areaThemes.overview },
      { href: "/curriculum-journey", label: "Year Group Journey", icon: "YJ", theme: areaThemes.overview },
      { href: "/framework-browser", label: "Framework Browser", icon: "FB", theme: areaThemes.overview }
    ]
  },
  {
    title: "Subjects",
    items: [
      { href: "/subjects", label: "Subject View", icon: "SV", theme: areaThemes.overview },
      { href: "/subject-overview", label: "Subject Comparison", icon: "SC", theme: areaThemes.overview }
    ]
  },
  {
    title: "Tools",
    items: [
      { href: "/add-entry", label: "Add Mapping Entry", icon: "+", theme: areaThemes.overview },
      { href: "/recent-mapping", label: "Recent Updates", icon: "RU", theme: areaThemes.overview },
      { href: "/review-summary", label: "Review Summary", icon: "RS", theme: areaThemes.overview }
    ]
  },
  {
    title: "Setup",
    items: [{ href: "/admin", label: "Admin Setup", icon: "Ad", theme: areaThemes.overview }]
  }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { settings } = useSchoolSettings();
  const shortSchoolName = settings.branding.schoolName.replace(" Comprehensive School", "");

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[310px_1fr]">
      <aside className="border-b border-gray-200 text-white lg:min-h-screen lg:border-b-0" style={{ backgroundColor: settings.branding.primaryColour }}>
        <div className="px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-md bg-white p-1.5">
              <img src={settings.branding.logoDataUrl} alt={`${settings.branding.schoolName} logo`} className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#f1d8e6]">{shortSchoolName}</div>
              <h1 className="mt-1 text-2xl font-bold">Skills Tracker</h1>
            </div>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#f8e8f0]">{settings.branding.motto}</p>
        </div>

        <nav className="flex gap-3 overflow-x-auto px-4 pb-5 lg:block lg:space-y-5 lg:overflow-visible lg:px-4">
          {navGroups.map((group) => (
            <div key={group.title} className="flex min-w-max gap-2 lg:block lg:min-w-0 lg:space-y-2">
              <div className="hidden px-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#f1d8e6] lg:block">{group.title}</div>
              {group.items.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`focus-ring group relative flex min-w-max items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 lg:min-w-0 ${
                      active ? "bg-[#fff8fb] shadow-md" : "border-transparent bg-transparent text-white hover:bg-[#571435] hover:shadow-sm"
                    }`}
                    style={{ borderColor: active ? "rgba(255, 255, 255, 0.86)" : "transparent", color: active ? settings.branding.secondaryColour : "#ffffff" }}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-opacity duration-200" style={{ backgroundColor: settings.branding.secondaryColour, opacity: active ? 1 : 0 }} aria-hidden="true" />
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[0.68rem] font-bold transition-colors duration-200"
                      style={{
                        backgroundColor: active ? settings.branding.secondaryColour : "rgba(87, 20, 53, 0.78)",
                        color: "#ffffff",
                        border: active ? "1px solid rgba(87, 20, 53, 0.22)" : "1px solid rgba(255,255,255,0.16)"
                      }}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate leading-5" style={{ color: active ? settings.branding.secondaryColour : "#ffffff" }}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <main className="min-w-0">
        <div className="border-b border-gray-200 bg-white px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm font-semibold text-gray-600">
              <img src={settings.branding.logoDataUrl} alt="" className="h-8 w-8 object-contain" />
              <span>{settings.branding.schoolName} curriculum mapping system</span>
            </div>
            <div className="rounded-full border bg-[#fff8fb] px-3 py-1 text-xs font-bold" style={{ borderColor: settings.branding.primaryColour, color: settings.branding.primaryColour }}>
              Curriculum mapping only
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-[1800px] px-5 py-6">{children}</div>
      </main>
    </div>
  );
}
