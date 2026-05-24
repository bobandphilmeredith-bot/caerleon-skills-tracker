"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { areaThemes, themeForFramework } from "@/lib/theme";
import { useSchoolSettings } from "@/lib/schoolSettings";
import { roleBadgeClass, roleLabels, type UserRole, useAuth } from "@/lib/auth";

const navGroups = [
  {
    title: "Dashboards",
    layout: "dashboard",
    items: [
      { href: "/", label: "Whole School", icon: "WS", theme: areaThemes.overview, wide: true },
      { href: "/literacy", label: "Literacy", icon: "Li", theme: themeForFramework("Literacy") },
      { href: "/numeracy", label: "Numeracy", icon: "Nu", theme: themeForFramework("Numeracy") },
      { href: "/dcf", label: "DCF", icon: "DC", theme: themeForFramework("Digital Competence Framework") },
      { href: "/themes", label: "Themes", icon: "CT", theme: themeForFramework("Cross-cutting Themes") }
    ]
  },
  {
    title: "Subjects",
    items: [
      { href: "/subjects", label: "Subject View", icon: "SV", theme: areaThemes.overview },
      { href: "/subject-overview", label: "Subject Comparison", icon: "SC", theme: areaThemes.overview },
      { href: "/admin", label: "Subject Setup", icon: "SS", theme: areaThemes.overview, roles: ["platform_admin", "school_admin"] as UserRole[] }
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
    title: "Review",
    items: [
      { href: "/recent-mapping", label: "Recent Updates", icon: "RU", theme: areaThemes.overview },
      { href: "/review-summary", label: "Review Summary", icon: "RS", theme: areaThemes.overview }
    ]
  },
  {
    title: "Setup",
    items: [
      { href: "/admin", label: "Admin Setup", icon: "Ad", theme: areaThemes.overview, roles: ["platform_admin", "school_admin"] as UserRole[] },
      { href: "/user-management", label: "User Management", icon: "UM", theme: areaThemes.overview, roles: ["platform_admin", "school_admin"] as UserRole[] },
      { href: "/platform-admin", label: "Platform Admin", icon: "PA", theme: areaThemes.overview, roles: ["platform_admin"] as UserRole[] },
      { href: "/login", label: "Sign In", icon: "In", theme: areaThemes.overview }
    ]
  }
];

const primaryAction = { href: "/add-entry", label: "Add Mapping Entry", icon: "+", theme: areaThemes.overview, roles: ["platform_admin", "school_admin", "teacher", "subject_lead"] as UserRole[] };

type NavItem = (typeof navGroups)[number]["items"][number] | typeof primaryAction;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { settings } = useSchoolSettings();
  const { currentUser, isDemoMode, users, loginAs } = useAuth();
  const shortSchoolName = settings.branding.schoolName.replace(" Comprehensive School", "");
  const activeUsers = users.filter((user) => user.active);

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[310px_1fr]">
      <aside className="border-b border-gray-200 text-white lg:sticky lg:top-0 lg:max-h-screen lg:min-h-screen lg:overflow-hidden lg:border-b-0" style={{ backgroundColor: settings.branding.primaryColour }}>
        <div className="px-5 py-5">
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

        <nav className="flex gap-3 overflow-x-auto px-4 pb-5 lg:block lg:max-h-[calc(100vh-8.75rem)] lg:space-y-4 lg:overflow-y-auto lg:overflow-x-hidden lg:px-4 lg:pr-3">
          {canShowItem(primaryAction, currentUser) ? <NavLink item={primaryAction} pathname={pathname} primary brandPrimary={settings.branding.primaryColour} brandSecondary={settings.branding.secondaryColour} /> : null}
          {navGroups.map((group) => (
            <div key={group.title} className="flex min-w-max gap-2 lg:block lg:min-w-0 lg:space-y-1.5">
              <div className="hidden px-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#f1d8e6] lg:block">{group.title}</div>
              <div className={group.layout === "dashboard" ? "grid gap-1.5 lg:grid-cols-2" : "space-y-1.5"}>
                {group.items
                  .filter((item) => canShowItem(item, currentUser))
                  .map((item) => (
                    <NavLink key={item.href} item={item} pathname={pathname} brandPrimary={settings.branding.primaryColour} brandSecondary={settings.branding.secondaryColour} compact={group.layout === "dashboard" && !("wide" in item && item.wide)} wide={"wide" in item && item.wide} />
                  ))}
              </div>
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
            <div className="flex flex-wrap items-center gap-2">
              {currentUser ? (
                <>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${roleBadgeClass(currentUser.role)}`}>{roleLabels[currentUser.role]}</span>
                  {isDemoMode ? (
                    <select className="focus-ring rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700" value={currentUser.id} onChange={(event) => loginAs(event.target.value)} aria-label="Staff profile switcher">
                      {activeUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} - {roleLabels[user.role]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-bold text-gray-600">{currentUser.name}</span>
                  )}
                </>
              ) : (
                <Link className="focus-ring btn btn-primary text-xs" href="/login">
                  Sign in
                </Link>
              )}
              <div className="rounded-full border bg-[#fff8fb] px-3 py-1 text-xs font-bold" style={{ borderColor: settings.branding.primaryColour, color: settings.branding.primaryColour }}>
                Curriculum mapping only
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-[1800px] px-5 py-6">{children}</div>
      </main>
    </div>
  );
}

function canShowItem(item: NavItem, currentUser: ReturnType<typeof useAuth>["currentUser"]) {
  return !("roles" in item) || !item.roles || (currentUser && item.roles.includes(currentUser.role));
}

function NavLink({ item, pathname, brandPrimary, brandSecondary, primary = false, compact = false, wide = false }: { item: NavItem; pathname: string; brandPrimary: string; brandSecondary: string; primary?: boolean; compact?: boolean; wide?: boolean }) {
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={`focus-ring group relative flex min-w-max items-center rounded-lg border text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-sm lg:min-w-0 ${active ? "shadow-md" : "border-transparent bg-transparent text-white"} ${primary ? "mb-4 gap-3 px-3 py-2.5" : compact ? "gap-2 px-2.5 py-2 lg:[&_.nav-label]:text-xs" : "gap-3 px-3 py-2"} ${wide ? "lg:col-span-2" : ""}`}
      style={{
        backgroundColor: active ? "color-mix(in srgb, white 94%, var(--school-primary))" : undefined,
        borderColor: active || primary ? "rgba(255, 255, 255, 0.86)" : "transparent",
        color: active ? brandSecondary : undefined
      }}
      aria-current={active ? "page" : undefined}
      onMouseEnter={(event) => {
        if (!active) event.currentTarget.style.backgroundColor = brandPrimary;
      }}
      onMouseLeave={(event) => {
        if (!active) event.currentTarget.style.backgroundColor = "";
      }}
    >
      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-opacity duration-200" style={{ backgroundColor: brandSecondary, opacity: active ? 1 : 0 }} aria-hidden="true" />
      <span
        className={`grid shrink-0 place-items-center rounded-md font-bold transition-colors duration-200 ${primary ? "h-8 w-8 text-sm" : compact ? "h-7 w-7 text-[0.62rem]" : "h-8 w-8 text-[0.68rem]"}`}
        style={{
          backgroundColor: active || primary ? brandSecondary : "color-mix(in srgb, var(--school-secondary) 72%, transparent)",
          border: active ? "1px solid color-mix(in srgb, var(--school-primary) 22%, transparent)" : "1px solid rgba(255,255,255,0.16)"
        }}
      >
        {item.icon}
      </span>
      <span className="nav-label min-w-0 truncate leading-5" style={{ color: active ? brandSecondary : undefined }}>
        {item.label}
      </span>
    </Link>
  );
}
