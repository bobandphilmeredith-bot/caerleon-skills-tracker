"use client";

import { useState } from "react";
import type { CrossCuttingTheme, SelectedCctElement } from "@/lib/types";
import { areaThemes } from "@/lib/theme";

export function CctElementSelector({
  themes,
  selected,
  onChange
}: {
  themes: CrossCuttingTheme[];
  selected: SelectedCctElement[];
  onChange: (selected: SelectedCctElement[]) => void;
}) {
  const [openThemeIds, setOpenThemeIds] = useState<Set<string>>(() => new Set());
  const selectedKeys = new Set(selected.map((item) => selectionKey(item.themeId, item.elementId)));
  const activeThemes = themes.filter((theme) => theme.active);
  const elementCount = activeThemes.reduce((sum, theme) => sum + (theme.elements?.filter((element) => element.active).length ?? 0), 0);

  function toggle(themeId: string, elementId: string, checked: boolean) {
    const next = checked
      ? [...selected, { themeId, elementId }]
      : selected.filter((item) => item.themeId !== themeId || item.elementId !== elementId);
    onChange(Array.from(new Map(next.map((item) => [selectionKey(item.themeId, item.elementId), item])).values()));
  }

  function toggleTheme(themeId: string) {
    setOpenThemeIds((current) => {
      const next = new Set(current);
      if (next.has(themeId)) next.delete(themeId);
      else next.add(themeId);
      return next;
    });
  }

  if (!elementCount) {
    return <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">No active cross-cutting theme elements found for this school.</p>;
  }

  return (
    <div className="space-y-3">
      {activeThemes.map((theme) => {
        const elements = (theme.elements ?? []).filter((element) => element.active);
        const selectedCount = elements.filter((element) => selectedKeys.has(selectionKey(theme.id, element.id))).length;
        const open = openThemeIds.has(theme.id);

        return (
          <section key={theme.id} className="rounded-lg border border-gray-200 bg-white">
            <button
              className="focus-ring flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left font-bold text-gray-950"
              type="button"
              aria-expanded={open}
              onClick={() => toggleTheme(theme.id)}
            >
              <span className="min-w-0">
                <span className="block truncate">{theme.name}</span>
                {theme.description ? <span className="mt-1 block text-sm font-normal leading-5 text-gray-600">{theme.description}</span> : null}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ backgroundColor: areaThemes.overview.soft, color: areaThemes.overview.text }}>
                  {selectedCount} selected
                </span>
                <span aria-hidden="true" className="text-sm text-gray-500">
                  {open ? "-" : "+"}
                </span>
              </span>
            </button>
            <div className={open ? "grid gap-2 border-t border-gray-200 px-3 py-3 md:grid-cols-2" : "hidden"}>
              {elements.map((element) => {
                  const checked = selectedKeys.has(selectionKey(theme.id, element.id));
                  return (
                    <label
                      key={element.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm font-semibold transition ${checked ? "" : "border-gray-200 bg-white text-gray-800"}`}
                      style={checked ? { borderColor: areaThemes.overview.accent, backgroundColor: areaThemes.overview.soft, color: areaThemes.overview.text } : undefined}
                    >
                      <input className="mt-1 h-4 w-4" type="checkbox" checked={checked} onChange={(event) => toggle(theme.id, element.id, event.target.checked)} />
                      <span>
                        {element.name}
                        {element.description ? <span className="mt-1 block text-xs font-normal leading-5 text-gray-500">{element.description}</span> : null}
                      </span>
                    </label>
                  );
                })}
                {!elements.length ? <p className="text-sm text-gray-600">No active elements for this theme.</p> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function selectionKey(themeId: string, elementId: string) {
  return `${themeId}:${elementId}`;
}
