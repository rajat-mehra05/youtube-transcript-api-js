# Dependabot Security Audit and Fix Plan

Status: **plan only, no code changes yet.** This document is the audit + execution plan for review.

`youtube-transcript-api-js` is a published npm library (v3.0.3) with **41 open Dependabot alerts**.
Because this is a library, the alerts that matter most are the ones that ship to consumers (runtime
dependencies), not necessarily the ones with the highest CVSS score. The audit below reflects that.

---

## Executive Summary

| Severity | Count |
|---|---|
| Critical | 1 |
| High | 19 |
| Moderate | 18 |
| Low | 3 |
| **Total** | **41** |

The 41 alerts collapse into a handful of root causes:

- **25 alerts are runtime** and reduce to **2 direct version bumps** (`axios`, `fast-xml-parser`).
  These two bumps also pull patched versions of their own transitive deps (`follow-redirects`,
  `form-data`, `fast-xml-builder`). This is the part that actually protects consumers.
- **16 alerts are dev-only transitive** (jest / ts-jest / eslint / changesets toolchain). 14 clear
  with an in-range lockfile refresh; the last 2 (`minimatch@9.0.3`) need a `typescript-eslint`
  major bump because that version is pinned exactly.

The single **Critical** (`handlebars` CVE-2026-33937, CVSS 9.8) is **dev-only** and clears with a
trivial minor bump, so it does not block the runtime work and does not affect published output.

Decisions already agreed with the maintainer:
- Modernize the dev toolchain (not just minimum patches).
- Fix the `minimatch@9.0.3` holdout by bumping `typescript-eslint` 6 → 8 (not an npm override).
- Ship as grouped PRs in priority order.

---

## Dependency Analysis

### Runtime (ships to consumers)

**axios `^1.15.0` → `^1.18.1`** — 21 alerts (High/Moderate/Low), direct runtime.
- Why vulnerable: a large batch of prototype-pollution "read-side gadget" issues in axios's config
  merge (MITM via `config.proxy` GHSA-35jp-ww65-95wh CVSS 8.7, credential theft, header injection,
  XSRF leakage), plus proxy-auth header leaks on redirect, ReDoS via cookie names, unbounded
  `toFormData` recursion, and `NO_PROXY` bypass variants (incl. the IPv4-mapped IPv6 case fixed in
  1.16.0).
- Risk to this repo: real. The library lets users pass proxy URLs and builds requests with
  user-influenced language codes and cookie headers. The proxy/credential-leak and SSRF classes are
  the relevant ones. All patched by 1.16.0; latest stable is 1.18.1.
- Breaking changes: none for this codebase. Usage sticks to stable 1.x surfaces — `axios.create`,
  `interceptors.request.use` setting `config.proxy`, `client.defaults.proxy = false`,
  `defaults.headers.common`, and `AxiosError` shape. The 1.16→1.18 behavior changes (content-length
  enforcement, proxy host-header handling) are the security fixes themselves.
- Effort: trivial (version bump). Testing: low — axios is `jest.mock('axios')`-mocked in every test
  that constructs a client, so the suite is insulated.

**fast-xml-parser `^5.5.8` → `^5.9.3`** — 1 alert (#34, Moderate), direct runtime.
- Why vulnerable: XML comment / CDATA injection via unescaped delimiters in XMLBuilder
  (GHSA-gh4j-gqv2-49f6), patched 5.7.0.
- Risk to this repo: low in practice — the library only uses `XMLParser` (never `XMLBuilder`) on
  server-controlled YouTube caption XML. Still worth patching, and 5.9.3 also pulls a patched
  `fast-xml-builder` (see below).
- Breaking changes: none. 5.5→5.9 is within major 5; the only call site (`transcripts/parser.ts:38`)
  uses `{ ignoreAttributes: false, isArray }` with default `#text` / `@_` conventions.
- Effort: trivial. Testing: low — exercised for real by `__tests__/parser.test.ts` against fixtures,
  so any output-shape regression is caught.

**follow-redirects `1.15.11` → `1.16.0`** — 1 alert (#30, Moderate), transitive via axios.
- Why: custom Authorization headers leak to cross-domain redirect targets (GHSA-r4q5-vmmm-2653).
- Fix: axios 1.18.1 declares `follow-redirects ^1.16.0`, so it resolves to the patched version. No
  direct action beyond the axios bump.

**form-data `4.0.5` → `4.0.6`** — 1 alert (#57, High), transitive via axios.
- Why: CRLF injection via unescaped multipart field names/filenames (CVE-2026-12143).
- Fix: axios 1.18.1 declares `form-data ^4.0.5`, which resolves to the patched 4.0.6. Not directly
  exploitable here (the library does not send multipart bodies), but the bump clears it for free.

**fast-xml-builder `1.1.4` → `^1.2.x`** — 1 alert (#43, High), transitive via fast-xml-parser.
- Why: attribute values with unwanted quotes can bypass attribute filtering (CVE-2026-44665).
- Fix: fast-xml-parser 5.9.3 declares `fast-xml-builder ^1.2.0`; the parser bump resolves it.

### Dev-only transitive (does not ship to consumers)

**handlebars `4.7.8` → `4.7.9`** — 7 alerts incl. the **Critical**, via `ts-jest`.
- Why: JS injection via AST type confusion (CVE-2026-33937, CVSS 9.8 Critical), CLI precompiler
  injection, prototype-method access gaps, prototype-pollution XSS.
- Risk to this repo: essentially none. handlebars is pulled only by ts-jest's internals; the project
  never compiles attacker-supplied templates. The high score reflects the library's worst case, not
  this project's exposure.
- Fix: `ts-jest ^29.4.11` declares `handlebars ^4.7.9`; the minor ts-jest bump plus a lockfile
  refresh lands the patch. Effort: trivial. Testing: run the suite.

**js-yaml (3.x and 4.x)** — 3 alerts (Moderate), via changesets / eslint / ts-jest.
- Why: prototype pollution and quadratic-complexity DoS in YAML merge-key handling.
- Fix: in-range refresh (v3 → 3.15.0, v4 → 4.3.0). No package.json change needed beyond the
  toolchain bumps; parents' `^3.x` / `^4.x` ranges already allow the patched versions.

**picomatch (2.x and 4.x)** — 2 alerts (Moderate), via jest / tsup / changesets / ts-jest.
- Why: method injection in POSIX character classes causing incorrect glob matching.
- Fix: in-range refresh (v2 → 2.3.2, v4 → 4.0.5).

**minimatch (3.x)** — 1 alert (#10, High), via eslint / jest.
- Why: ReDoS via multiple non-adjacent GLOBSTAR segments (CVE-2026-27903).
- Fix: in-range refresh (3.1.2 → 3.1.3); parents declare `^3.x`.

**minimatch (9.x)** — 1 alert (#9, High), via `@typescript-eslint/typescript-estree@6.21.0`.
- Why: same ReDoS (CVE-2026-27903), patched 9.0.7.
- Risk: dev-only. Cannot be fixed by a lockfile refresh — typescript-estree 6.21.0 pins
  `minimatch` to the exact `9.0.3`.
- Fix: bump `typescript-eslint` 6 → 8 (v8 depends on a patched minimatch range). This is the reason
  PR3 exists.

**flatted `3.3.3` → `3.4.2`** — 1 alert (#14, High), via eslint's flat-cache.
- Why: prototype pollution via `parse()` (CVE-2026-33228).
- Fix: in-range refresh (flat-cache declares `flatted ^3.2.9`).

**@babel/core `7.28.4` → `7.29.6`** — 1 alert (#60, Low), via jest.
- Why: arbitrary file read via `sourceMappingURL` comment (CVE-2026-49356).
- Fix: in-range refresh (jest declares `@babel/core ^7.11.6`); stays on 7.x (jest 29/30 need <8).

---

## PR Plan

### PR 1 — Runtime security fixes (merge first)
Exists because these are the only alerts that reach consumers of the published package, and they
carry the highest real-world risk (axios MITM / credential leak / SSRF, CVSS 7–8.7). Clears **25
alerts**.
- `package.json`: `axios ^1.15.0 → ^1.18.1`, `fast-xml-parser ^5.5.8 → ^5.9.3`.
- Refresh `package-lock.json`; confirm it resolves `follow-redirects@1.16.0`, `form-data@4.0.6`,
  `fast-xml-builder@^1.2.x`.
- No source changes expected.

### PR 2 — Dev transitive patches, no code changes
Exists to retire the **Critical** (handlebars) and 13 other dev alerts with zero code churn, so the
scary score is cleared quickly without waiting on the risky flat-config migration. Clears **14
alerts**.
- devDeps: `ts-jest ^29.4.1 → ^29.4.11`, `@changesets/cli ^2.29.8 → ^2.31.0`.
- Refresh lockfile so in-range patches land: handlebars 4.7.9, js-yaml 3.15.0 / 4.3.0,
  picomatch 2.3.2 / 4.0.5, minimatch 3.1.3, flatted 3.4.2, @babel/core 7.29.6.

### PR 3 — Toolchain modernization (code changes)
Exists because the last alert (`minimatch@9.0.3`) is only fixable via a `typescript-eslint` major
bump; the related EOL-toolchain upgrades are bundled here. Clears the final **2 alerts**.
- devDeps:
  - Replace `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin ^6.12` with the unified
    `typescript-eslint ^8.63.0` (drops the exact minimatch pin → fixes alert #9).
  - `eslint ^8.54 → ^10.7.0`, add `@eslint/js ^10.0.1`.
  - `jest ^29.7.0 → ^30.4.2` (ts-jest 29.4.11 already supports jest `^30`).
  - `@types/node ^20 → ^24` (match Node 24 runtime, not 26 which is ahead of it).
- Flat-config migration: delete `.eslintrc.js`, add `eslint.config.mjs` (`@eslint/js` recommended +
  `typescript-eslint` parser over `youtube-transcript-api-js/**/*.ts`, `ignores` for `dist`/
  `coverage`, node/jest globals). Preserve current lint behavior (`no-unused-vars: warn`,
  `no-undef: off`); do not enable the full tseslint recommended ruleset (separate opt-in change).

### PR 4 — Optional cleanup (not security, needs sign-off)
- Remove the dead `html-entities` dependency (declared in `package.json`, never imported in
  `youtube-transcript-api-js/` or `dist/`; unescaping is hand-rolled in `fetcher.ts`).
- Out of scope unless requested: `commander 14→15`, `http/https-proxy-agent 7→9` (no CVEs).

---

## Verification (run after every PR, do not stop until green)

1. `npm install` then `npm ci` — clean, reproducible install.
2. `npm run lint` — PR3 must lint cleanly under the new flat config.
3. `npx tsc --noEmit` — typecheck.
4. `npm test` — full jest suite. After PR1 confirm `parser.test.ts` passes (real fast-xml-parser on
   fixtures); axios-mocked tests are insulated from the axios bump.
5. `npm run build` — tsup CJS+ESM+dts + CLI copy must succeed.
6. `npm audit --omit=dev` after PR1 (expect 0 runtime vulns); `npm audit` after PR3 (expect 0).

Optional end-to-end smoke check (network-dependent, once at the end):
`node dist/cli.js <videoId>` to confirm a real transcript fetch still parses through the upgraded
axios + fast-xml-parser path.

---

## Summary Table

| Dependency | Old | New | Severity (worst) | Breaking Change | Status (planned) |
|---|---|---|---|---|---|
| axios | 1.15.0 | 1.18.1 | High | No | PR1 |
| follow-redirects | 1.15.11 | 1.16.0 | Moderate | No | PR1 (via axios) |
| form-data | 4.0.5 | 4.0.6 | High | No | PR1 (via axios) |
| fast-xml-parser | 5.5.8 | 5.9.3 | Moderate | No | PR1 |
| fast-xml-builder | 1.1.4 | 1.2.x | High | No | PR1 (via f-x-p) |
| handlebars | 4.7.8 | 4.7.9 | Critical | No | PR2 |
| js-yaml | 3.14.1 / 4.1.1 | 3.15.0 / 4.3.0 | Moderate | No | PR2 |
| picomatch | 2.3.1 / 4.0.3 | 2.3.2 / 4.0.5 | Moderate | No | PR2 |
| minimatch (v3) | 3.1.2 | 3.1.3 | High | No | PR2 |
| flatted | 3.3.3 | 3.4.2 | High | No | PR2 |
| @babel/core | 7.28.4 | 7.29.6 | Low | No | PR2 |
| minimatch (v9) | 9.0.3 | 9.0.7 | High | No | PR3 |
| typescript-eslint | 6.21 (split) | 8.63 (unified) | n/a | Yes (flat config) | PR3 |
| eslint | 8.57 | 10.7 | n/a | Yes (flat config) | PR3 |
| jest | 29.7 | 30.4 | n/a | Low | PR3 |
| @types/node | 20.x | 24.x | n/a | No | PR3 |
| html-entities | 2.6.0 | removed | n/a (unused) | No | PR4 (optional) |

All 41 alerts are resolved across PR1–PR3. No alert is suppressed or ignored.
