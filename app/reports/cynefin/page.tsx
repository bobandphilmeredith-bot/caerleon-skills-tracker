"use client";

import Link from "next/link";
import { useState } from "react";
import { useCurrentSchool } from "@/lib/currentSchool";
import { cynefinCsv, cynefinMatch } from "@/lib/cynefin";

export default function CynefinPlan() {
  const { data, currentSchool } = useCurrentSchool();
  return <Plan key={data.schoolId} data={data} schoolName={currentSchool.name} />;
}

function Plan({ data, schoolName }: { data: ReturnType<typeof useCurrentSchool>["data"]; schoolName: string }) {
  const [subject, setSubject] = useState("");
  const [term, setTerm] = useState("");
  const [year, setYear] = useState("");
  const matches = data.mappings.flatMap((entry) => {
    const reason = cynefinMatch(entry, data.crossCuttingThemes);
    return reason ? [{ entry, reason }] : [];
  });
  const termOrder = (value: string) => {
    const index = data.terms.indexOf(value);
    return index < 0 ? data.terms.length : index;
  };
  const rows = matches.filter(({ entry }) => (!subject || entry.subject === subject) && (!term || entry.term === term) && (!year || entry.year === year))
    .sort((a, b) => termOrder(a.entry.term) - termOrder(b.entry.term) || a.entry.term.localeCompare(b.entry.term, undefined, { numeric: true }) || a.entry.subject.localeCompare(b.entry.subject) || a.entry.year.localeCompare(b.entry.year, undefined, { numeric: true }) || a.entry.unit.localeCompare(b.entry.unit));
  const options = (field: "subject" | "term" | "year") => Array.from(new Set(matches.map(({ entry }) => entry[field]).filter(Boolean))).sort((a, b) => field === "term" ? termOrder(a) - termOrder(b) || a.localeCompare(b, undefined, { numeric: true }) : a.localeCompare(b, undefined, { numeric: true }));
  const description = (entry: typeof data.mappings[number]) => entry.activityDescription || entry.taskDescription || entry.context || "Work description not recorded";

  function download() {
    const csv = cynefinCsv([
      ["School", "Subject", "Term", "Year group", "Unit / activity", "Planned work", "Theme notes", "Scheme reference", "Included because"],
      ...rows.map(({ entry, reason }) => [schoolName, entry.subject, entry.term, entry.year, entry.unit, description(entry), entry.crossCuttingThemeNotes ?? "", entry.schemeReference, reason])
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "cynefin-plan.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-950">Cynefin Plan</h1><p className="mt-2 text-sm text-gray-600">{schoolName} · Recorded curriculum plans</p></div>
        <div className="flex flex-wrap gap-2">
          <Link className="focus-ring btn btn-primary" href="/add-entry">Add Curriculum</Link>
          <button className="focus-ring btn btn-secondary disabled:opacity-50" disabled={!rows.length} onClick={download}>Download CSV</button>
        </div>
      </header>
      <div className="flex flex-wrap gap-4 border-y border-gray-200 py-4">
        {([{ label: "Subject", value: subject, set: setSubject, values: options("subject") }, { label: "Term", value: term, set: setTerm, values: options("term") }, { label: "Year group", value: year, set: setYear, values: options("year") }]).map((filter) => (
          <label key={filter.label} className="flex min-w-40 flex-1 flex-col gap-1 text-sm font-semibold">{filter.label}
            <select className="focus-ring rounded-md border border-gray-300 bg-white p-2" value={filter.value} onChange={(event) => filter.set(event.target.value)}><option value="">All</option>{filter.values.map((value) => <option key={value}>{value}</option>)}</select>
          </label>
        ))}
        <button className="focus-ring btn btn-muted self-end" onClick={() => { setSubject(""); setTerm(""); setYear(""); }}>Clear filters</button>
      </div>
      <p className="text-sm text-gray-600" aria-live="polite">{rows.length} planned activities across {new Set(rows.map(({ entry }) => entry.subject)).size} subjects</p>
      {!rows.length ? <div className="border-y border-gray-200 py-8"><h2 className="font-bold">No Cynefin plans recorded{subject || term || year ? " for these filters" : ""}</h2><p className="mt-2 text-sm text-gray-600">No matching curriculum entries are currently available.</p></div> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-gray-100"><tr>{["Subject", "Term", "Year group", "Planned work", "Cynefin connection"].map((label) => <th key={label} scope="col" className="border-b border-gray-300 p-3">{label}</th>)}</tr></thead>
            <tbody>{rows.map(({ entry, reason }) => <tr key={entry.id} className="border-b border-gray-200 align-top">
              <td className="p-3 font-semibold">{entry.subject}</td><td className="p-3">{entry.term || "Not recorded"}</td><td className="p-3">{entry.year}</td>
              <td className="max-w-xl p-3"><p className="font-semibold">{entry.unit || "Untitled activity"}</p><p className="mt-1 whitespace-pre-wrap break-words">{description(entry)}</p>{entry.schemeReference && <p className="mt-2 break-words text-gray-500">Scheme: {entry.schemeReference}</p>}</td>
              <td className="max-w-sm p-3"><p>{reason}</p>{entry.crossCuttingThemeNotes && <p className="mt-2 whitespace-pre-wrap break-words text-gray-600">{entry.crossCuttingThemeNotes}</p>}</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
