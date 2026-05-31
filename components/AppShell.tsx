"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { areaThemes, themeForFramework } from "@/lib/theme";
import { useSchoolSettings } from "@/lib/schoolSettings";
import { roleBadgeClass, roleLabels, type UserRole, useAuth } from "@/lib/auth";

const navGroups = [
  {
    title: "Dashboards",
    icon: "DB",
    items: [
      { href: "/", label: "Whole School", icon: "WS", theme: areaThemes.overview },
      { href: "/literacy", label: "Literacy", icon: "Li", theme: themeForFramework("Literacy") },
      { href: "/numeracy", label: "Numeracy", icon: "Nu", theme: themeForFramework("Numeracy") },
      { href: "/dcf", label: "DCF", icon: "DC", theme: themeForFramework("Digital Competence Framework") },
      { href: "/themes", label: "Themes", icon: "CT", theme: themeForFramework("Cross-cutting Themes") }
    ]
  },
  {
    title: "Subjects",
    icon: "SU",
    items: [
      { href: "/subjects", label: "Subject View", icon: "SV", theme: areaThemes.overview },
      { href: "/subject-overview", label: "Subject Detail", icon: "SD", theme: areaThemes.overview }
    ]
  },
  {
    title: "Explore",
    icon: "EX",
    items: [
      { href: "/curriculum-explorer", label: "Skills Explorer", icon: "SE", theme: areaThemes.overview },
      { href: "/progression-overview", label: "Progression Overview", icon: "PO", theme: areaThemes.overview },
      { href: "/curriculum-journey", label: "Year Group Journey", icon: "YJ", theme: areaThemes.overview },
      { href: "/framework-browser", label: "Framework Browser", icon: "FB", theme: areaThemes.overview }
    ]
  },
  {
    title: "Review",
    icon: "RV",
    items: [
      { href: "/reports/subject-health", label: "Subject Health Report", icon: "SH", theme: areaThemes.overview, roles: ["platform_admin", "school_admin", "teacher", "subject_lead"] as UserRole[] },
      { href: "/reports/slt-improvement", label: "SLT Improvement Dashboard", icon: "SI", theme: areaThemes.overview, roles: ["platform_admin", "school_admin"] as UserRole[] },
      { href: "/recent-mapping", label: "Recent Updates", icon: "RU", theme: areaThemes.overview },
      { href: "/review-summary", label: "Review Summary", icon: "RS", theme: areaThemes.overview }
    ]
  },
  {
    title: "Setup / Admin",
    icon: "SA",
    items: [
      { href: "/admin", label: "Admin Setup", icon: "Ad", theme: areaThemes.overview, roles: ["platform_admin", "school_admin"] as UserRole[] },
      { href: "/admin/import-curriculum", label: "Import Curriculum", icon: "IC", theme: areaThemes.overview, roles: ["platform_admin", "school_admin"] as UserRole[] },
      { href: "/user-management", label: "User Management", icon: "UM", theme: areaThemes.overview, roles: ["platform_admin", "school_admin"] as UserRole[] },
      { href: "/platform-admin", label: "Platform Admin", icon: "PA", theme: areaThemes.overview, roles: ["platform_admin"] as UserRole[] },
      { href: "/login", label: "Sign In", icon: "In", theme: areaThemes.overview }
    ]
  }
];

const primaryActions = [
  { href: "/add-entry", label: "Add Curriculum", icon: "+", theme: areaThemes.overview, roles: ["platform_admin", "school_admin", "teacher", "subject_lead"] as UserRole[] },
  { href: "/edit-curriculum", label: "Edit Curriculum", icon: "EC", theme: areaThemes.overview, roles: ["platform_admin", "school_admin", "teacher", "subject_lead"] as UserRole[] }
];

type NavItem = (typeof navGroups)[number]["items"][number] | (typeof primaryActions)[number];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSchoolSettings();
  const { currentUser, realUser, isDemoMode, users, loginAs, canPreviewRoles, previewRole, isRolePreview, setPreviewRole, clearRolePreview, authLoading } = useAuth();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const shortSchoolName = settings.branding.schoolName.replace(" Comprehensive School", "");
  const activeUsers = users.filter((user) => user.active);

  useEffect(() => {
    function closeOnOutsidePointer(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-sidebar-menu-region]")) return;
      setOpenGroup(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenGroup(null);
    }

    document.addEventListener("mousedown", closeOnOutsidePointer);
    document.addEventListener("touchstart", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePointer);
      document.removeEventListener("touchstart", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const publicPage = isPublicPage(pathname);

  useEffect(() => {
    if (isDemoMode || authLoading || currentUser || publicPage) return;
    const loginUrl = new URL("/login", window.location.origin);
    loginUrl.searchParams.set("next", `${window.location.pathname}${window.location.search}`);
    loginUrl.searchParams.set("session", "expired");
    router.replace(loginUrl.pathname + loginUrl.search);
  }, [authLoading, currentUser, isDemoMode, publicPage, router]);

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-gray-200 text-white lg:sticky lg:top-0 lg:z-30 lg:max-h-screen lg:min-h-screen lg:overflow-y-auto lg:overflow-x-hidden lg:border-b-0" style={{ backgroundColor: settings.branding.primaryColour }}>
        <div className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-white p-1.5">
              <img src={settings.branding.logoDataUrl} alt={`${settings.branding.schoolName} logo`} className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#f1d8e6]">{shortSchoolName}</div>
              <h1 className="mt-1 text-xl font-bold">Skills Tracker</h1>
            </div>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#f8e8f0]">{settings.branding.motto}</p>
        </div>

        <nav className="flex gap-3 overflow-x-auto px-4 pb-5 lg:block lg:space-y-2 lg:overflow-visible lg:px-4 lg:pr-3">
          <div className="flex gap-2 lg:block lg:space-y-2">
            {primaryActions
              .filter((item) => canShowItem(item, currentUser))
              .map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} primary brandPrimary={settings.branding.primaryColour} brandSecondary={settings.branding.secondaryColour} />
              ))}
          </div>
          {navGroups
            .map((group) => ({ ...group, items: group.items.filter((item) => canShowItem(item, currentUser)) }))
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <FlyoutGroup key={group.title} group={group} pathname={pathname} openGroup={openGroup} setOpenGroup={setOpenGroup} flyoutTop={flyoutTop} setFlyoutTop={setFlyoutTop} brandPrimary={settings.branding.primaryColour} brandSecondary={settings.branding.secondaryColour} />
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
                  {canPreviewRoles && realUser ? (
                    <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-700">
                      <span>View as</span>
                      <select
                        className="focus-ring rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-bold text-gray-700"
                        value={previewRole ?? realUser.role}
                        onChange={(event) => setPreviewRole(event.target.value as UserRole)}
                        aria-label="Preview app as role"
                      >
                        {(Object.keys(roleLabels) as UserRole[]).map((role) => (
                          <option key={role} value={role}>
                            {roleLabels[role]}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
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
        {isRolePreview && realUser && previewRole ? (
          <div className="border-b border-gray-200 bg-white px-5 py-3">
            <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-semibold text-gray-700">
                Viewing as <span className="font-bold text-gray-950">{roleLabels[previewRole]}</span>. Your real role is still{" "}
                <span className="font-bold text-gray-950">{roleLabels[realUser.role]}</span>.
              </p>
              <button className="focus-ring btn btn-secondary text-xs" type="button" onClick={clearRolePreview}>
                Return to Platform Admin
              </button>
            </div>
          </div>
        ) : null}
        <div className="mx-auto max-w-[1800px] px-5 py-6">
          {!isDemoMode && !publicPage && authLoading ? <SessionGate title="Checking sign-in" message="Checking your secure session before loading school data." /> : null}
          {!isDemoMode && !publicPage && !authLoading && !currentUser ? <SessionGate title="Sign in required" message="This area is protected. Sign in to view curriculum data." showAction /> : null}
          {isDemoMode || publicPage || currentUser ? children : null}
        </div>
      </main>
    </div>
  );
}

function SessionGate({ title, message, showAction = false }: { title: string; message: string; showAction?: boolean }) {
  return (
    <section className="mx-auto max-w-2xl py-12">
      <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.14em]" style={{ color: areaThemes.overview.text }}>
          Protected area
        </p>
        <h1 className="mt-3 text-3xl font-bold text-gray-950">{title}</h1>
        <p className="mt-3 text-base leading-7 text-gray-600">{message}</p>
        {showAction ? (
          <Link className="focus-ring btn btn-primary mt-5" href={`/login?next=${encodeURIComponent(typeof window === "undefined" ? "/" : `${window.location.pathname}${window.location.search}`)}&session=expired`}>
            Sign in
          </Link>
        ) : null}
      </article>
    </section>
  );
}

function isPublicPage(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/auth/callback") || pathname === "/reset-password";
}

function canShowItem(item: NavItem, currentUser: ReturnType<typeof useAuth>["currentUser"]) {
  return !("roles" in item) || !item.roles || (currentUser && item.roles.includes(currentUser.role));
}

type NavGroup = (typeof navGroups)[number] & { items: NavItem[] };

function FlyoutGroup({ group, pathname, openGroup, setOpenGroup, flyoutTop, setFlyoutTop, brandPrimary, brandSecondary }: { group: NavGroup; pathname: string; openGroup: string | null; setOpenGroup: (title: string | null) => void; flyoutTop: number; setFlyoutTop: (top: number) => void; brandPrimary: string; brandSecondary: string }) {
  const isOpen = openGroup === group.title;
  const active = group.items.some((item) => isActivePath(item.href, pathname));
  const menuId = `sidebar-menu-${group.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const openFromTrigger = (element: HTMLElement) => {
    setFlyoutTop(element.getBoundingClientRect().top);
    setOpenGroup(group.title);
  };

  return (
    <div className="relative min-w-max lg:min-w-0" data-sidebar-menu-region onMouseEnter={(event) => openFromTrigger(event.currentTarget)} onFocus={(event) => openFromTrigger(event.currentTarget)}>
      <button
        type="button"
        className={`focus-ring flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm font-bold transition-all ${active ? "shadow-sm" : "border-transparent"}`}
        style={{
          backgroundColor: active ? "color-mix(in srgb, white 94%, var(--school-primary))" : undefined,
          borderColor: active ? "rgba(255, 255, 255, 0.86)" : "transparent",
          color: active ? brandSecondary : undefined
        }}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={(event) => {
          setFlyoutTop(event.currentTarget.getBoundingClientRect().top);
          setOpenGroup(isOpen ? null : group.title);
        }}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[0.62rem] font-bold"
            style={{
              backgroundColor: active ? brandSecondary : "color-mix(in srgb, var(--school-secondary) 72%, transparent)",
              border: active ? "1px solid color-mix(in srgb, var(--school-primary) 22%, transparent)" : "1px solid rgba(255,255,255,0.16)"
            }}
          >
            {group.icon}
          </span>
          <span className="truncate" style={{ color: active ? brandSecondary : undefined }}>
            {group.title}
          </span>
        </span>
        <span aria-hidden="true" className="text-xs">
          {isOpen ? "-" : "+"}
        </span>
      </button>

      <div
        id={menuId}
        className={`z-50 mt-2 min-w-64 rounded-lg border bg-white p-2 text-gray-900 shadow-xl lg:fixed lg:left-[calc(280px+0.75rem)] lg:mt-0 ${isOpen ? "block" : "hidden"}`}
        style={{ borderColor: "color-mix(in srgb, var(--school-primary) 18%, white)", top: flyoutTop }}
        role="menu"
        data-sidebar-menu-region
        onMouseEnter={() => setOpenGroup(group.title)}
      >
        <div className="px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em]" style={{ color: brandSecondary }}>
          {group.title}
        </div>
        <div className="mt-1 space-y-1">
          {group.items.map((item) => (
            <FlyoutLink key={item.href} item={item} pathname={pathname} brandSecondary={brandSecondary} onNavigate={() => setOpenGroup(null)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FlyoutLink({ item, pathname, brandSecondary, onNavigate }: { item: NavItem; pathname: string; brandSecondary: string; onNavigate: () => void }) {
  const active = isActivePath(item.href, pathname);

  return (
    <Link
      href={item.href}
      role="menuitem"
      onClick={onNavigate}
      className="focus-ring flex items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold hover:bg-gray-50"
      style={{
        backgroundColor: active ? "color-mix(in srgb, var(--school-primary) 10%, white)" : undefined,
        color: active ? brandSecondary : undefined
      }}
      aria-current={active ? "page" : undefined}
    >
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[0.62rem] font-bold text-white"
        style={{
          backgroundColor: active ? brandSecondary : "color-mix(in srgb, var(--school-secondary) 72%, transparent)"
        }}
      >
        {item.icon}
      </span>
      <span className="min-w-0 truncate">{item.label}</span>
    </Link>
  );
}

function NavLink({ item, pathname, brandPrimary, brandSecondary, primary = false }: { item: NavItem; pathname: string; brandPrimary: string; brandSecondary: string; primary?: boolean }) {
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={`focus-ring group relative flex min-w-max items-center rounded-lg border text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-sm lg:min-w-0 ${active ? "shadow-md" : "border-transparent bg-transparent text-white"} ${primary ? "mb-3 gap-3 px-3 py-2.5" : "gap-3 px-3 py-2"}`}
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
        className={`grid shrink-0 place-items-center rounded-md font-bold transition-colors duration-200 ${primary ? "h-8 w-8 text-sm" : "h-8 w-8 text-[0.68rem]"} ${active && primary ? "text-white" : ""}`}
        style={{
          backgroundColor: active && primary ? brandPrimary : active || primary ? brandSecondary : "color-mix(in srgb, var(--school-secondary) 72%, transparent)",
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

function isActivePath(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
