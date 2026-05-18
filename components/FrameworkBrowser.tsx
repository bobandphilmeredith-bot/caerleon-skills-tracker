"use client";

import { useMemo, useState } from "react";
import { useCurrentSchoolData } from "@/lib/currentSchool";
import { progressionSteps, visibleProgressionSteps } from "@/lib/progression";
import { themeForFramework } from "@/lib/theme";

export function FrameworkBrowser({ initialFramework, compact = false }: { initialFramework?: string; compact?: boolean }) {
  const { frameworkLibrary } = useCurrentSchoolData();
  const [frameworkName, setFrameworkName] = useState(initialFramework);
  const framework = frameworkLibrary.find((item) => item.name === frameworkName) ?? frameworkLibrary[0];
  const theme = themeForFramework(framework.name);
  const [strandFilter, setStrandFilter] = useState("All strands");
  const [search, setSearch] = useState("");
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showAllProgressionSteps, setShowAllProgressionSteps] = useState(false);
  const displayedSteps = showAllProgressionSteps ? progressionSteps : visibleProgressionSteps;

  const strands = useMemo(() => {
    const query = search.toLowerCase();
    return framework.strands
      .filter((strand) => strandFilter === "All strands" || strand.name === strandFilter)
      .map((strand) => ({
        ...strand,
        elements: strand.elements.filter((element) =>
          [element.name, element.officialWording, element.explanation, ...element.examples, ...element.searchKeywords, ...element.relatedConnections]
            .join(" ")
            .toLowerCase()
            .includes(query)
        )
      }))
      .filter((strand) => strand.elements.length > 0);
  }, [framework, search, strandFilter]);

  function updateFramework(nextFramework: string) {
    setFrameworkName(nextFramework);
    setStrandFilter("All strands");
    setSearch("");
  }

  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-3"}`}>
        <label>
          <span className="mb-1 block text-sm font-semibold text-gray-700">Framework</span>
          <select className="focus-ring w-full rounded-md border bg-white px-3 py-2" style={{ borderColor: theme.border }} value={framework.name} onChange={(event) => updateFramework(event.target.value)}>
            {frameworkLibrary.map((item) => (
              <option key={item.name}>{item.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold text-gray-700">Strand filter</span>
          <select className="focus-ring w-full rounded-md border bg-white px-3 py-2" style={{ borderColor: theme.border }} value={strandFilter} onChange={(event) => setStrandFilter(event.target.value)}>
            <option>All strands</option>
            {framework.strands.map((strand) => (
              <option key={strand.name}>{strand.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold text-gray-700">Element search</span>
          <input className="focus-ring w-full rounded-md border px-3 py-2" style={{ borderColor: theme.border }} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search elements" />
        </label>
      </div>

      <div className="space-y-3">
        {strands.map((strand) => (
          <details key={strand.name} className="rounded-lg border bg-white p-4 shadow-sm" style={{ borderColor: theme.border }} open>
            <summary className="cursor-pointer text-base font-bold" style={{ color: theme.text }}>
              {strand.name}
            </summary>
            <div className="mt-4 space-y-3">
              {strand.elements.map((element) => (
                <article key={element.name} className="rounded-md border p-4" style={{ borderColor: theme.border, backgroundColor: theme.soft }}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold" style={{ color: theme.text }}>
                        {element.name}
                      </h3>
                      <p className="mt-2 text-sm font-semibold text-gray-800">{element.officialWording}</p>
                      <p className="mt-2 text-sm leading-6 text-gray-700">{element.explanation}</p>
                    </div>
                    <button className="focus-ring rounded-md px-3 py-2 text-sm font-bold" style={{ backgroundColor: theme.accent, color: theme.contrast }} type="button" onClick={() => setSelectedElement(element.name)}>
                      Use this element in mapping
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {element.examples.map((example) => (
                      <span key={example} className="rounded-full bg-white px-3 py-1 text-xs font-semibold" style={{ color: theme.text }}>
                        {example}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 rounded-md bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Progression descriptors</h4>
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-700">
                        <input type="checkbox" checked={showAllProgressionSteps} onChange={(event) => setShowAllProgressionSteps(event.target.checked)} />
                        Show all progression steps
                      </label>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {displayedSteps.map((step) => (
                        <div key={step} className="rounded-md border border-gray-100 bg-gray-50 p-3 text-sm leading-6">
                          <span className="font-bold text-gray-950">{step}: </span>
                          <span className="text-gray-700">{element.progressionDescriptors?.[step] ?? "Descriptor can be edited in Admin Setup."}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-md bg-white p-3">
                      <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Suggested search keywords</h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {element.searchKeywords.map((keyword) => (
                          <span key={keyword} className="rounded-full px-2 py-1 text-xs font-semibold" style={{ backgroundColor: theme.soft, color: theme.text }}>
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-md bg-white p-3">
                      <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Also commonly mapped with...</h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {element.relatedConnections.map((connection) => (
                          <span key={connection} className="rounded-full px-2 py-1 text-xs font-semibold" style={{ backgroundColor: theme.soft, color: theme.text }}>
                            {connection}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </details>
        ))}
      </div>
      {selectedElement ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 py-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-xl font-bold text-gray-950">{selectedElement}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-700">Open Add Mapping Entry to connect this element to a subject, year group and planned activity.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a className="focus-ring rounded-md px-4 py-2 text-sm font-bold text-white" style={{ backgroundColor: theme.accent }} href="/add-entry">
                Open Add Mapping Entry
              </a>
              <button className="focus-ring rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700" type="button" onClick={() => setSelectedElement(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
