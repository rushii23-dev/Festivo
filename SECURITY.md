# Security

Festivo is a planning assistant: people describe an event, a server route asks an AI model for
a plan, and the plan lives in their own browser. There are no accounts on the server, no
database and no cookies. This document lists what we protect, who we protect it from, and every
mitigation, with the file that implements it and the test that proves it.

## Reporting a vulnerability

Please use **GitHub's private vulnerability reporting** on this repository (Security tab →
"Report a vulnerability") rather than a public issue. Include steps to reproduce. Only the latest
`main` is supported.

## What we protect

| Asset                        | Why it matters                                                          |
| ---------------------------- | ----------------------------------------------------------------------- |
| The Gemini API key           | Whoever holds it can spend the project's quota and money.               |
| AI quota and cost            | Repeated or abusive generation is the cheapest way to hurt the service. |
| Visitors' plans and profiles | Names, dates, places and budgets, kept in the visitor's browser only.   |
| Page integrity               | Injected script would see everything a visitor types.                   |
| The model's instructions     | User text must never be able to change what the model is told to do.    |

## Who we protect it from

1. **Anonymous internet clients** calling `/api/*` directly: floods, oversized or malformed
   bodies, forged headers to dodge rate limits.
2. **Other websites** making a visitor's browser post to our API (cross-site request forgery).
3. **Prompt injection**: instructions hidden in an event name, a location, a must-have note or a
   refine request ("ignore previous instructions…"), including invisible and look-alike
   characters.
4. **A misbehaving model**: output that is malformed, out of range, or not what was asked.
5. **Script injection** into pages, and framing (clickjacking).
6. **Compromised or vulnerable dependencies.**

## Mitigations

### Secrets never reach the browser

- AI code runs only in route handlers. Every AI module starts with `import "server-only"`, so a
  client import fails the build (`lib/ai/*`, `lib/plan/service.ts`, `lib/http/api.ts`).
- Settings are read from server environment variables, none prefixed `NEXT_PUBLIC_`, and
  validated with Zod (`lib/ai/config.ts`). A placeholder key counts as no key.
- CI fails if a key-shaped string, `GEMINI_API_KEY` or the Gemini host appears anywhere in the
  client bundle (`.github/workflows/ci.yml`); the end-to-end suite checks every script the
  browser downloads (`tests/e2e/security.spec.ts`).
- The Docker image takes secrets at run time only; nothing secret is baked into a layer.

### Every request is checked before any work

The guard order in each route is: cross-site check → rate limit → body → schema → service
(`app/api/*/route.ts`, `lib/http/api.ts`).

- **Cross-site requests are refused** (403): `Sec-Fetch-Site` must be `same-origin` (or absent),
  and an `Origin` header must match the host. Requests must be `application/json`, which a
  browser cannot send cross-site without a CORS preflight we never grant. There are no cookies,
  so there are no ambient credentials to ride on.
- **Bodies are capped while streaming**: 16 KB for a new plan, 128 KB for refine and ideas. The
  reader stops the moment the cap is passed, so a chunked upload without `Content-Length` cannot
  make the server buffer more (413). Bytes that are not valid UTF-8 are refused (400); wrong
  content types get 415.
- **Strict schemas**: every body is parsed with Zod strict objects that reject unknown fields at
  every level and cap every string, number and list (`lib/schemas/*`, `lib/http/requests.ts`).
  Dates in the past are refused, with the visitor's time zone taken into account.
- **Text is cleaned** before it is stored or prompted: NFKC normalisation (folds look-alike
  characters), removal of control, zero-width and bidirectional-override characters, whitespace
  collapsing and length caps (`lib/security/sanitize.ts`).

### Rate limiting that cannot be dodged

`lib/security/rateLimit.ts`, wired in `lib/http/api.ts`:

- A token bucket per client: 8 requests a minute by default (`API_RATE_LIMIT_PER_MINUTE`);
  generating a whole plan costs 2. Blocked clients get **429 with `Retry-After`**.
- **The client address cannot be forged.** `X-Forwarded-For` is read from the right, at the
  number of trusted proxies (`TRUSTED_PROXY_HOPS`, default 1), because every entry to the left of
  our own proxy is whatever the client chose to send. Rotating a fake first entry does not help
  (tested in `tests/api/plan.test.ts`).
- **IPv6 clients are grouped by /64**, since one home or phone network hands out a whole /64.
- **Flood-proof memory**: the bucket map is bounded (10,000 keys), and eviction only reclaims
  buckets that are not currently blocked. A flood of 5,000 rotating addresses cannot push a
  blocked client out and hand it a fresh bucket (`tests/unit/security.test.ts`).

### Prompt injection

- Every piece of user text is wrapped in `<user_data name="…">` tags, cleaned, length-capped
  and escaped so it cannot close the tag (`lib/security/promptGuard.ts`, used by every prompt in
  `lib/ai/prompts.ts`). Saved plans sent back for refining are delimited the same way, because
  their titles were typed by people.
- The system prompt tells the model that tag contents are data, never instructions, and never
  to change format because of them (`SYSTEM_PROMPT`).
- Likely injection phrasing is logged for monitoring (`detectInjection`). It is not blocked,
  because "please ignore the old guest list" is a legitimate note; the structural defences above
  do the real work.
- **Refine can only touch allowed fields.** The model returns a patch validated by a strict
  schema (`PlanPatchSchema` in `lib/ai/schemas.ts`); anything outside the allow-list fails. The
  patch is applied by code that re-validates dates and budgets (`lib/plan/patch.ts`), and the
  visitor sees a diff and must accept it before anything changes.

### The model's output is never trusted

- Structured JSON output with a response schema, then Zod validation; one repair attempt; then
  a friendly error with a retry button (`lib/ai/parse.ts`, `tests/api/plan.test.ts`).
- The model returns a lean draft. Code computes every date, ID and budget figure, re-normalises
  amounts to the exact total and clamps task dates between today and the event
  (`lib/plan/fromDraft.ts`, `lib/budget/*`, `lib/timeline/*`).
- Output is rendered as text by React only. `dangerouslySetInnerHTML` is banned by lint
  (`react/no-danger`) and appears nowhere.

### Hardened responses

Pages get a per-request nonce Content-Security-Policy from `proxy.ts`; every response gets the
static headers from `lib/security/headers.ts` (applied in `next.config.ts`):

| Header                                            | Value and purpose                                                                                                                                                                                              |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy` (pages)                 | `script-src 'self' 'nonce-…' 'strict-dynamic'`, no `unsafe-eval` in production, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests` over HTTPS |
| `Content-Security-Policy` (API)                   | `default-src 'none'; frame-ancestors 'none'`: JSON never renders or loads anything                                                                                                                             |
| `Strict-Transport-Security`                       | Two years, subdomains, preload (HTTPS deployments only)                                                                                                                                                        |
| `X-Frame-Options`                                 | `DENY`, alongside `frame-ancestors 'none'`                                                                                                                                                                     |
| `X-Content-Type-Options`                          | `nosniff`                                                                                                                                                                                                      |
| `Referrer-Policy`                                 | `strict-origin-when-cross-origin`                                                                                                                                                                              |
| `Permissions-Policy`                              | Camera, microphone, geolocation, payment, USB and topics all off                                                                                                                                               |
| `Cross-Origin-Opener-Policy` / `-Resource-Policy` | `same-origin`                                                                                                                                                                                                  |
| `Origin-Agent-Cluster`                            | `?1`: the origin gets its own agent cluster                                                                                                                                                                    |
| `X-Permitted-Cross-Domain-Policies`               | `none`                                                                                                                                                                                                         |
| `Cache-Control` (API)                             | `no-store`                                                                                                                                                                                                     |
| `X-Powered-By`                                    | Removed                                                                                                                                                                                                        |

Verified by `tests/unit/headers.test.ts` and, against the production server,
`tests/e2e/security.spec.ts` (which also proves the app runs under the CSP with no violations).

### Errors say nothing useful to an attacker

Clients get generic, friendly messages with a stable error code (`ERROR_MESSAGES` in
`lib/plan/service.ts`). Provider errors, validation issues and stack traces go to server logs
only. Tests assert that responses never contain upstream messages, stack traces or the key.

### Cost and abuse controls on the AI

- Identical requests are served from an in-memory LRU cache with a TTL, keyed by a SHA-256 hash
  of the normalised input and the model (`lib/cache/lru.ts`).
- Identical requests that arrive while the first is still running share its call
  (`lib/cache/singleFlight.ts`), so a double-click or a second tab never pays twice.
- Output token caps per task, a 60-second timeout, and at most two retries with backoff for
  transient upstream failures (`lib/ai/gemini.ts`, `GEMINI_RETRIES`).
- "More like this" and refine regenerate one section only.

### Data in the browser

- Plans and the profile live in `localStorage` on the visitor's device and are never sent
  anywhere except, for refine and ideas, the plan itself to our own API.
- Everything read back from storage is re-validated with Zod; a corrupted or tampered entry is
  dropped instead of crashing the page or reaching the UI (`lib/store/planStore.ts`,
  `lib/profile/profile.ts`).
- The "account" has no password: there is nothing to steal or reuse.

### Supply chain

- `package-lock.json` pins every version; CI installs with `npm ci`.
- `npm audit --omit=dev` must report **no vulnerabilities at any severity** for production
  dependencies; build tooling must have none rated high or critical.
- Dependabot opens weekly update pull requests for npm, GitHub Actions and the Docker base image
  (`.github/dependabot.yml`); CI decides whether each is safe.
- CodeQL (`security-and-quality` queries) scans every push, pull request and week
  (`.github/workflows/codeql.yml`).
- The container is a three-stage build that runs the standalone server as an unprivileged user
  (`Dockerfile`); CI builds it and checks the user.

## Known limitations

- The rate limiter and caches are in memory, per instance. A multi-instance deployment should
  move them to a shared store such as Redis.
- Styles allow `'unsafe-inline'` because Radix positions popovers with inline style attributes.
  Styles cannot run script; scripts stay nonce-only.
- Plans in `localStorage` are as private as the device and browser profile they live in.
- The Gemini path is tested end to end against a mocked API (MSW), not a live key.
