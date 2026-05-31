"use client";

import { AccessDenied } from "@/components/AccessDenied";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { useCurrentSchool } from "@/lib/currentSchool";
import { isDemoLoginEnabled } from "@/lib/supabaseClient";
import { areaThemes } from "@/lib/theme";

export default function PlatformAdminPage() {
  const { canManagePlatform } = useAuth();
  const { schools, currentSchool, addSchool, updateSchool, toggleSchoolActive, switchSchool } = useCurrentSchool();

  if (!canManagePlatform) {
    return <AccessDenied title="Platform admin restricted" message="Only platform admins can manage schools from this page." />;
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Platform Admin"
        eyebrow="School management"
        description="Manage schools before live platform administration is connected."
        accent={areaThemes.overview.accent}
      />

      {!isDemoLoginEnabled ? (
        <article className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-700 shadow-sm">
          Live school details are loaded from Supabase. Browser-only school creation is disabled so local prototype records cannot be mistaken for saved school data.
        </article>
      ) : (
        <article className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
          These changes are held in browser state until the live Supabase connection is switched on.
        </article>
      )}

      {isDemoLoginEnabled ? <div className="flex justify-end">
        <button className="focus-ring btn btn-primary" type="button" onClick={addSchool}>
          Add school
        </button>
      </div> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {(isDemoLoginEnabled ? schools : [currentSchool]).map((school) => (
          <article key={school.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-md border border-gray-200 bg-white p-1.5">
                <img src={school.logoUrl} alt="" className="h-full w-full object-contain" />
              </div>
              <div className="grid flex-1 gap-3 md:grid-cols-2">
                <LabelledInput label="School name" value={school.name} onChange={(value) => updateSchool(school.id, { name: value })} />
                <LabelledInput label="Slug" value={school.slug} onChange={(value) => updateSchool(school.id, { slug: value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })} />
                <LabelledInput label="Motto" value={school.motto} onChange={(value) => updateSchool(school.id, { motto: value })} />
                <LabelledInput label="Logo URL" value={school.logoUrl} onChange={(value) => updateSchool(school.id, { logoUrl: value })} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${school.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{school.active ? "Active" : "Inactive"}</span>
              {isDemoLoginEnabled ? (
                <>
                  <button className="focus-ring btn btn-secondary text-xs" type="button" onClick={() => switchSchool(school.id)} disabled={!school.active}>
                    Switch to school
                  </button>
                  <button className="focus-ring btn btn-muted text-xs" type="button" onClick={() => toggleSchoolActive(school.id)}>
                    {school.active ? "Deactivate" : "Reactivate"}
                  </button>
                </>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function LabelledInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
      <input className="focus-ring w-full rounded-md border border-gray-300 px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
