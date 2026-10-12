import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { readAllRows } from "../lib/readAllRows.ts";

const schoolId = "11111111-1111-4111-8111-111111111111";
const otherSchoolId = "22222222-2222-4222-8222-222222222222";
let actor = { profile: { role: "teacher", school_id: schoolId } };
let configured = true;
let failure = false;
let receivedToken;
let queries = [];
const client = { from(table) {
  const query = { table, filters: [], pages: [], select() { return this; }, eq(...args) { this.filters.push(args); return this; }, order() { return this; }, returns() { return this; },
    async range(from, to) {
      this.pages.push([from, to]);
      if (failure) return { data: null, error: { message: "Database unavailable" } };
      const rows = table === "cross_cutting_themes" ? [{ id: "theme", school_id: schoolId }] : Array.from({ length: 501 }, (_, id) => ({ id, theme_id: "theme", school_id: schoolId }));
      return { data: rows.slice(from, to + 1), error: null };
    }
  };
  queries.push(query);
  return query;
} };
const exports = {};
const route = fs.readFileSync("app/api/themes/route.ts", "utf8");
vm.runInNewContext(ts.transpileModule(route, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
  exports, URL,
  require(name) {
    if (name === "next/server") return { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200, headers: options.headers }) } };
    if (name.endsWith("_helpers")) return { getSupabaseAdmin: () => configured ? client : null, bearerToken: request => request.token ?? "", getActorProfile: async (_, token) => { receivedToken = token; return actor; } };
    if (name.endsWith("readAllRows")) return { readAllRows };
    throw new Error(`Unexpected import ${name}`);
  }
});
const request = (id = schoolId, token = "bearer") => ({ url: `https://tracker.test/api/themes?schoolId=${id}`, token, cookies: { get: () => ({ value: "cookie" }) } });
configured = false;
assert.equal((await exports.GET(request())).status, 503);
configured = true;
actor = { error: "You must be signed in." };
assert.equal((await exports.GET(request())).status, 401);
assert.equal(queries.length, 0);
actor = { profile: { role: "teacher", school_id: schoolId } };
assert.equal((await exports.GET(request(otherSchoolId))).status, 403);
assert.equal(queries.length, 0, "Cross-school requests must not reach the service-role queries");
assert.equal((await exports.GET(request("invalid"))).status, 400);
const success = await exports.GET(request());
assert.equal(success.status, 200);
assert.equal(success.body.elements.length, 501);
assert.equal(success.body.themes[0].elements.length, 501);
assert.equal(receivedToken, "bearer");
assert.equal(success.headers["Cache-Control"], "private, no-store");
assert.ok(queries.every(q => q.filters.some(([key, value]) => key === "school_id" && value === schoolId)));
assert.equal(queries[1].pages.length, 2);
await exports.GET(request(schoolId, ""));
assert.equal(receivedToken, "cookie", "Existing cookie-authenticated callers remain supported");
actor = { profile: { role: "platform_admin", school_id: otherSchoolId } };
assert.equal((await exports.GET(request())).status, 200);
failure = true;
assert.equal((await exports.GET(request())).status, 502, "Failed reads must not masquerade as empty catalogues");

const source = fs.readFileSync("lib/currentSchool.tsx", "utf8");
const ast = ts.createSourceFile("currentSchool.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const fn = ast.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === "loadThemeRows");
let fetchResult = { ok: true, json: async () => ({ themes: [{ id: "theme" }], elements: [{ id: "element" }] }) };
let fetched;
const sandbox = { fetch: async (...args) => { fetched = args; return fetchResult; } };
vm.createContext(sandbox);
vm.runInContext(ts.transpile(fn.getText(ast)), sandbox);
const sessionClient = { auth: { getSession: async () => ({ data: { session: { access_token: "test-token" } } }) } };
const loaded = await sandbox.loadThemeRows(sessionClient, schoolId);
assert.equal(loaded.elements.length, 1);
assert.equal(fetched[0], `/api/themes?schoolId=${schoolId}`);
assert.equal(fetched[1].headers.Authorization, "Bearer test-token");
fetchResult = { ok: false, json: async () => ({ error: "Theme read failed" }) };
await assert.rejects(sandbox.loadThemeRows(sessionClient, schoolId), /Theme read failed/);
fetchResult = { ok: true, json: async () => ({}) };
await assert.rejects(sandbox.loadThemeRows(sessionClient, schoolId), /could not be loaded/);
await assert.rejects(sandbox.loadThemeRows({ auth: { getSession: async () => ({ data: { session: null } }) } }, schoolId), /Sign in again/);
console.log("Passed: authorised server theme loading, school isolation, cookie and bearer authentication, pagination and visible failures.");
