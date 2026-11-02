// Shared by the live report and the self-contained, offline meeting pack.
export const dcfReportStyles = `
.dcf-document {
  --dcf-ink: #183832;
  --dcf-green: #245c50;
  --dcf-soft: #edf4f0;
  --dcf-line: #d9e3df;
  --dcf-muted: #556660;
  color: #243b34;
  background: #fff;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  max-width: 1240px;
  margin: auto;
}
.dcf-document * {
  box-sizing: border-box;
}
.dcf-document h1,
.dcf-document h2,
.dcf-document h3,
.dcf-document p {
  margin: 0;
}
.dcf-document h3 {
  font-size: 15px;
  line-height: 1.45;
}
.dcf-document p + p {
  margin-top: 10px;
}
.dcf-document a {
  color: var(--dcf-green);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.dcf-cover {
  padding: 40px 44px;
  background: var(--dcf-ink);
  color: #fff;
  border-radius: 12px 12px 0 0;
}
.dcf-kicker {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  border-bottom: 1px solid #53746b;
  padding-bottom: 20px;
}
.dcf-kicker span {
  font-weight: 400;
  color: #c5d9d0;
}
.dcf-cover-grid {
  display: grid;
  grid-template-columns: 1fr 130px;
  gap: 24px;
  align-items: center;
  margin: 32px 0;
}
.dcf-eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 11px;
  color: #b8d9cd;
  font-weight: 700;
}
.dcf-cover h1 {
  font-size: 42px;
  line-height: 1.13;
  letter-spacing: -1.1px;
  margin: 12px 0 18px;
  font-weight: 750;
}
.dcf-subtitle {
  color: #d3e0da;
  max-width: 590px;
  font-size: 15px;
}
.dcf-report-mark {
  border: 1px solid #6d9385;
  padding: 22px 18px;
  font-size: 37px;
  font-weight: 700;
  letter-spacing: -1px;
  line-height: 1.1;
}
.dcf-report-mark span {
  display: block;
  margin-top: 15px;
  color: #b8d9cd;
  font-size: 9px;
  line-height: 1.8;
  letter-spacing: 0.16em;
}
.dcf-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 30px;
  border-top: 1px solid #53746b;
  padding-top: 20px;
  font-size: 12px;
  color: #dce9e2;
}
.dcf-meta b {
  display: block;
  text-transform: uppercase;
  font-size: 9px;
  letter-spacing: 0.1em;
  margin-bottom: 4px;
  color: #a9ccbd;
}
.dcf-demo {
  margin-top: 20px !important;
  background: #fce8ba;
  color: #573e0c;
  padding: 10px 14px;
  font-weight: bold;
}
.dcf-section {
  padding: 32px 36px;
  border: 1px solid var(--dcf-line);
  border-top: 0;
  scroll-margin-top: 20px;
}
.dcf-section-heading {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 22px;
}
.dcf-section-heading > span {
  color: var(--dcf-green);
  background: var(--dcf-soft);
  border: 1px solid var(--dcf-line);
  font-size: 12px;
  min-width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  font-weight: bold;
  border-radius: 4px;
}
.dcf-section-heading h2 {
  font-size: 25px;
  letter-spacing: -0.5px;
  line-height: 1.25;
  color: var(--dcf-ink);
}
.dcf-section-heading p {
  color: var(--dcf-muted);
  font-size: 12px;
  margin-top: 5px;
}
.dcf-lead {
  font-size: 18px;
  line-height: 1.7;
  max-width: 950px;
}
.dcf-source {
  font-size: 11px;
  font-weight: bold;
  white-space: nowrap;
}
.dcf-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 24px 0;
  border: 1px solid var(--dcf-line);
  border-radius: 6px;
  overflow: hidden;
}
.dcf-metric {
  padding: 20px 18px;
  background: #f8faf8;
  border-right: 1px solid var(--dcf-line);
}
.dcf-metric:last-child {
  border: 0;
}
.dcf-metric strong {
  font-size: 31px;
  color: var(--dcf-green);
  letter-spacing: -1px;
  line-height: 1.2;
}
.dcf-metric h3 {
  font-size: 12px;
  margin-top: 8px;
}
.dcf-metric p {
  font-size: 11px;
  color: var(--dcf-muted);
  margin-top: 4px;
}
.dcf-two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
  margin: 18px 0;
}
.dcf-insight {
  border-left: 3px solid #aac6b8;
  padding: 4px 0 4px 16px;
}
.dcf-insight p {
  margin-top: 7px;
  font-size: 13px;
}
.dcf-caveat {
  background: #f9f6ed;
  border: 1px solid #e7dfc9;
  padding: 14px 18px;
  font-size: 12px;
  border-radius: 5px;
  margin-top: 22px;
}
.dcf-strands {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin: 24px 0;
}
.dcf-strand {
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 12px;
  padding: 18px;
  background: #f8faf8;
  border: 1px solid var(--dcf-line);
  border-radius: 6px;
}
.dcf-strand-index {
  font-size: 11px;
  color: var(--dcf-muted);
}
.dcf-strand p {
  font-size: 12px;
  margin-top: 6px;
}
.dcf-meter {
  height: 6px;
  background: #dfe8e2;
  margin-top: 13px;
  border-radius: 4px;
  overflow: hidden;
}
.dcf-meter span {
  display: block;
  height: 100%;
  background: #32725e;
}
.dcf-table-wrap {
  overflow-x: auto;
  margin: 22px 0 12px;
  max-width: 100%;
}
.dcf-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 12px;
  line-height: 1.5;
}
.dcf-table caption {
  text-align: left;
  color: var(--dcf-muted);
  font-size: 12px;
  padding: 0 0 12px;
}
.dcf-table th,
.dcf-table td {
  padding: 11px 10px;
  border-bottom: 1px solid var(--dcf-line);
  vertical-align: top;
  overflow-wrap: anywhere;
}
.dcf-table thead th {
  background: var(--dcf-ink);
  color: #fff;
  font-weight: 600;
  vertical-align: bottom;
}
.dcf-table tbody th {
  font-weight: 600;
  min-width: 140px;
  max-width: 300px;
}
.dcf-table small {
  display: block;
  color: var(--dcf-muted);
  font-size: 10px;
  line-height: 1.4;
  margin-bottom: 4px;
  font-weight: 400;
}
.dcf-table tbody tr:nth-child(even) {
  background: #fafbf9;
}
.dcf-numeric {
  text-align: center;
  min-width: 57px;
}
.dcf-filled {
  background: #edf4ef;
}
.dcf-count {
  background: transparent;
  color: #195b48;
  border: 0;
  border-bottom: 1px solid #548d78;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  min-width: 24px;
  padding: 1px 5px;
}
.dcf-count:focus-visible {
  outline: 3px solid #bc8b33;
  outline-offset: 2px;
}
.dcf-number {
  font-weight: 700;
}
.dcf-zero {
  color: #7d8b85;
}
.dcf-tag {
  display: inline-block;
  background: #edf2ed;
  color: #395a4b;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 3px;
  margin-bottom: 5px;
  white-space: nowrap;
}
.dcf-tag-amber {
  background: #fbf0d5;
  color: #775315;
}
.dcf-code {
  font-variant-numeric: tabular-nums;
  color: #527363;
  margin-right: 4px;
}
.dcf-footnote {
  font-size: 11px !important;
  color: var(--dcf-muted);
  line-height: 1.55;
}
.dcf-prompt {
  padding: 16px 18px;
  background: var(--dcf-soft);
  font-size: 13px;
  border-radius: 5px;
  margin-top: 20px;
}
.dcf-actions {
  border-top: 1px solid var(--dcf-line);
}
.dcf-action {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 16px;
  padding: 18px 0;
  border-bottom: 1px solid var(--dcf-line);
  break-inside: avoid;
}
.dcf-action-index {
  font-size: 20px;
  color: #6a8a79;
  display: block;
  margin-bottom: 4px;
}
.dcf-action p {
  font-size: 13px;
  margin-top: 7px;
}
.dcf-action-check {
  color: var(--dcf-muted);
  font-size: 12px !important;
}
.dcf-ref-list {
  font-size: 10px;
  overflow-wrap: anywhere;
}
.dcf-discussion-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 22px;
}
.dcf-discussion-card {
  padding: 20px;
  border: 1px solid var(--dcf-line);
  border-radius: 6px;
  break-inside: avoid;
}
.dcf-discussion-card h3 {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--dcf-green);
}
.dcf-question {
  font-size: 16px;
  font-weight: 600;
  margin-top: 10px !important;
}
.dcf-discussion-card p:last-child {
  font-size: 12px;
  color: var(--dcf-muted);
  margin-top: 10px;
}
.dcf-meeting {
  margin-top: 26px;
  padding: 22px;
  background: #f8faf8;
  border: 1px solid var(--dcf-line);
  border-radius: 5px;
}
.dcf-meeting > p {
  margin-top: 8px;
}
.dcf-note {
  margin-top: 16px;
  font-size: 12px;
}
.dcf-note > b {
  display: block;
  font-size: 11px;
  color: var(--dcf-muted);
  margin-bottom: 6px;
}
.dcf-note > p {
  min-height: 30px;
  border-bottom: 1px solid var(--dcf-line);
  padding-bottom: 10px;
}
.dcf-source-block {
  font-size: 12px;
  margin: 18px 0;
}
.dcf-source-block ul {
  padding-left: 19px;
  list-style: disc;
  margin: 12px 0;
}
.dcf-source-block li {
  margin: 8px 0;
}
.dcf-source-block h3 {
  margin-bottom: 8px;
}
.dcf-evidence-card {
  border: 1px solid var(--dcf-line);
  border-radius: 5px;
  padding: 22px;
  margin: 18px 0;
  break-inside: avoid;
}
.dcf-evidence-heading {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 14px;
}
.dcf-evidence-id {
  font-family: monospace;
  font-weight: 700;
  color: var(--dcf-green);
  background: var(--dcf-soft);
  padding: 4px 8px;
}
.dcf-evidence-heading p {
  font-size: 11px;
  color: var(--dcf-muted);
  margin-top: 4px;
}
.dcf-preserve {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.dcf-evidence-card ul {
  list-style: disc;
  padding-left: 18px;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.dcf-evidence-card li {
  margin: 8px 0;
}
.dcf-appendix-note {
  padding: 18px 36px;
  font-size: 12px;
  background: #f5f6f2;
  border: 1px solid var(--dcf-line);
  border-top: 0;
}
.dcf-footer {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 36px;
  font-size: 10px;
  color: var(--dcf-muted);
  border-bottom: 3px solid var(--dcf-green);
}
.dcf-empty {
  background: #f7f5ee;
  padding: 18px;
  margin-top: 18px !important;
  border-radius: 4px;
}
@media (max-width: 800px) {
  .dcf-cover {
    padding: 26px;
  }
  .dcf-cover h1 {
    font-size: 34px;
  }
  .dcf-section {
    padding: 26px 22px;
  }
  .dcf-metrics {
    grid-template-columns: 1fr 1fr;
  }
  .dcf-metric {
    border-bottom: 1px solid var(--dcf-line);
  }
  .dcf-strands {
    grid-template-columns: 1fr;
  }
  .dcf-table {
    min-width: 660px;
  }
  .dcf-two-column,
  .dcf-discussion-grid {
    grid-template-columns: 1fr;
  }
  .dcf-report-mark {
    display: none;
  }
  .dcf-cover-grid {
    grid-template-columns: 1fr;
  }
  .dcf-kicker {
    display: block;
  }
  .dcf-kicker span {
    display: block;
    margin-top: 6px;
  }
  .dcf-footer {
    display: block;
  }
  .dcf-footer span {
    display: block;
    margin-top: 6px;
  }
}
@page {
  size: A4 landscape;
  margin: 14mm;
  @bottom-left {
    content: "DCF management report · Planned provision";
    font-family: Arial, sans-serif;
    font-size: 8pt;
    color: #556660;
  }
  @bottom-right {
    content: "Page " counter(page) " of " counter(pages);
    font-family: Arial, sans-serif;
    font-size: 8pt;
    color: #556660;
  }
}
@media print {
  body:has(.dcf-document) {
    background: white !important;
  }
  body:has(.dcf-document) aside,
  body:has(.dcf-document) main > div:first-child,
  .dcf-controls,
  .dcf-inspector {
    display: none !important;
  }
  body:has(.dcf-document) > div {
    display: block !important;
  }
  body:has(.dcf-document) main {
    width: 100% !important;
  }
  body:has(.dcf-document) main > div {
    max-width: none !important;
    padding: 0 !important;
  }
  .dcf-document {
    font-size: 10pt;
    max-width: none;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .dcf-cover {
    padding: 9mm;
    border-radius: 0;
  }
  .dcf-cover h1 {
    font-size: 31pt;
  }
  .dcf-cover-grid {
    grid-template-columns: 1fr 100px;
    margin: 7mm 0;
  }
  .dcf-kicker {
    display: flex;
  }
  .dcf-report-mark {
    display: block;
  }
  .dcf-meta {
    font-size: 9pt;
  }
  .dcf-section {
    padding: 8mm 0 0;
    border: 0;
    break-before: auto;
  }
  #dcf-summary,
  #dcf-coverage,
  #dcf-reach {
    break-before: page;
  }
  .dcf-table-wrap:has(.dcf-compact-table) {
    break-inside: avoid;
  }
  .dcf-section-heading {
    margin-bottom: 5mm;
    break-after: avoid;
  }
  .dcf-section-heading h2 {
    font-size: 20pt;
  }
  .dcf-section-heading p {
    font-size: 9pt;
  }
  .dcf-lead {
    font-size: 13pt;
  }
  .dcf-metrics {
    grid-template-columns: repeat(4, 1fr);
    margin: 5mm 0;
  }
  .dcf-metric {
    padding: 5mm;
  }
  .dcf-metric strong {
    font-size: 23pt;
  }
  .dcf-two-column,
  .dcf-strands,
  .dcf-discussion-grid {
    grid-template-columns: 1fr 1fr;
  }
  .dcf-table-wrap {
    overflow: visible;
    margin-top: 5mm;
  }
  .dcf-table {
    min-width: 0;
    table-layout: fixed;
    font-size: 8.5pt;
  }
  .dcf-table thead {
    display: table-header-group;
  }
  .dcf-table th,
  .dcf-table td {
    padding: 2.5mm 2mm;
    min-width: 0;
  }
  .dcf-table th:first-child {
    width: 24%;
  }
  .dcf-element-table th:first-child {
    width: 28%;
  }
  .dcf-element-table th:last-child {
    width: 22%;
  }
  [data-dcf-interactive-hint] {
    display: none;
  }
  .dcf-table th,
  .dcf-table td {
    padding: 2mm;
  }
  .dcf-table caption {
    font-size: 9pt;
  }
  .dcf-table tr {
    break-inside: avoid;
  }
  .dcf-count {
    color: inherit;
    border: 0;
    padding: 0;
  }
  .dcf-table small,
  .dcf-tag {
    font-size: 7.5pt;
  }
  .dcf-table small {
    margin-top: 1mm;
  }
  .dcf-strand,
  .dcf-metrics,
  .dcf-insight,
  .dcf-meeting {
    break-inside: avoid;
  }
  .dcf-footnote {
    font-size: 8pt !important;
  }
  .dcf-caveat {
    font-size: 9pt;
  }
  .dcf-action p {
    font-size: 9pt;
  }
  .dcf-evidence-card {
    font-size: 10pt;
  }
  .dcf-source-block {
    font-size: 9pt;
  }
  .dcf-preserve {
    white-space: pre-wrap;
  }
  .dcf-footer {
    margin-top: 8mm;
    padding: 4mm 0;
  }
  .dcf-document a {
    color: inherit;
  }
  .dcf-appendix-note {
    margin-top: 6mm;
  }
}
`;
