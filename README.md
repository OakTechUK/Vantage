# Vantage

Vantage is a multi-force missing persons operations platform, rebuilt from the ground up as a
modern C#/.NET API with a React/Next.js front end. It records every stage of a missing person
enquiry, keeps the enduring person history, supports risk-based supervisory reviews, intelligently
detects duplicate tasks, and generates force-level reporting and statutory returns.

> **Prototype notice.** All data in the demo environment is synthetic. Do not enter real personal
> data. This repository is a working vertical slice and a foundation for production hardening, not
> an accredited police system.

---

## What is implemented

### Case management
- Enduring **person record** with description, physical details, vulnerability flags and images.
- **Missing episodes** linked to the person, so repeat missing people never need re-keying.
- Risk assessment (low / medium / high / critical), missing vs absent category, last-seen details.
- Full lifecycle: reported → active → located → closed, with outcome and closure notes.
- Automatic **case references** per force and year (`WPC-26-0001`).
- **Risk-based review scheduling** using per-force intervals, colour-coded review status
  (on track / due soon / overdue) and full review history.
- **Operations dashboard** with priority review queue, recent enquiries, risk profile, location
  hotspots and repeat missing people.

### Tasks and duplicate detection
- Tasks with category, priority, assignee, due date, linked location and outcome.
- **Typo-tolerant duplicate detection** using a normalised Levenshtein distance with token-sorted
  comparison and configurable thresholds. Creating a task that looks like an existing one returns
  `409` with ranked matches; the officer can explicitly override.
- Live duplicate check endpoint for client-side validation.

### Intelligence and search
- Associates / people of interest with a significant-risk flag.
- Places of interest with search priority.
- Categorised notes (background, family, health, risk, intelligence, exploitation) and a sensitive
  flag.
- **Individual Intelligence Report** aggregating risk factors, key people, key locations,
  intelligence notes, episode history and recommended search considerations.
- **iFIND-style search checklist**, filterable by child/adult and risk, with per-case completion
  tracking.

### Safeguarding and statutory features
- **Child abduction warning notices** (CAWN) with issue, expiry, revocation and audit history.
- Automatic **local authority notification** for children (interface-backed stub).
- **UK Missing Persons Bureau quarterly return** CSV export (interface-backed stub).
- Auditable by design: business actions plus automatic create/update/delete audit entries with
  actor, entity, changed fields and IP address.
- **Multi-tenancy** enforced at the persistence layer, with per-force configuration and reporting.

### Interface boundaries
The following are deliberately behind interfaces so they can be replaced without touching the API
or UI:

| Interface | Current implementation | Production direction |
|---|---|---|
| Repositories + `IUnitOfWork` | EF Core / SQLite | PostgreSQL/SQL Server repositories |
| `IFileStorage` | Local disk | S3 / Azure Blob with malware scanning |
| `IAuthenticationService` | ASP.NET Core Identity + JWT | Force SSO / Entra ID / OIDC |
| `ILocalAuthorityNotifier` | Logging stub | Secure email / partner API |
| `IMissingPersonsBureauExporter` | CSV stub | National submission format |
| `IReportQueries` | SQLite read model | Dedicated reporting database / warehouse |

---

## Architecture

```
┌────────────────────────────┐        ┌──────────────────────────────┐
│ Next.js (App Router)       │        │ ASP.NET Core minimal API      │
│ React 19 · Tailwind · shadcn│  HTTP  │ JWT auth · tenant guard       │
│ Server components + proxy  │ ─────► │ Endpoints → application       │
└────────────────────────────┘        └──────────────┬───────────────┘
                                                     │
                                      ┌──────────────▼───────────────┐
                                      │ Application                   │
                                      │ Services, DTOs, interfaces    │
                                      │ Levenshtein + duplicate check │
                                      │ Review scheduling, exports    │
                                      └──────────────┬───────────────┘
                                                     │
                                      ┌──────────────▼───────────────┐
                                      │ Infrastructure                │
                                      │ EF Core · Identity · JWT      │
                                      │ Repositories · storage        │
                                      │ Reporting · integrations      │
                                      └──────────────┬───────────────┘
                                                     │
                                      ┌──────────────▼───────────────┐
                                      │ SQLite (swappable)            │
                                      │ Tenant-scoped global filters  │
                                      └──────────────────────────────┘
```

### Projects

| Path | Purpose |
|---|---|
| `src/Vantage.Domain` | Entities, enums, tenant base type, domain behaviour |
| `src/Vantage.Application` | DTOs, service interfaces, application services, duplicate detection |
| `src/Vantage.Infrastructure` | EF Core context, repositories, Identity/JWT, storage, reporting, stubs |
| `src/Vantage.Api` | Minimal API endpoints, auth, tenant guard, error handling |
| `tests/Vantage.Tests` | Unit + SQLite integration tests |
| `web` | Next.js front end |

### Multi-tenancy

- Every tenant-owned entity carries `TenantId`.
- EF Core **global query filters** apply the current tenant automatically; `TenantId` is stamped on
  insert and defensively re-checked in the API middleware.
- The JWT carries `tenant_id`; an authenticated token without a valid tenant is rejected.
- Logins are scoped by force code **and** email.
- Per-force settings include review intervals, Missing Persons Bureau force code, local authority,
  and child notification behaviour.

### Swapping the database

1. Add the provider package (e.g. `Npgsql.EntityFrameworkCore.PostgreSQL`).
2. Change the `UseSqlite(...)` call in `Vantage.Infrastructure/DependencyInjection.cs`.
3. Optionally add EF migrations. The current demo uses `EnsureCreatedAsync`.

Repositories, services and endpoints do not reference provider-specific APIs. SQLite-specific
`DateTimeOffset` UTC-tick conversion is applied only when the provider is SQLite, so a production
provider retains native timestamps.

### Swapping identity

`IAuthenticationService` is the only seam the API uses. Replace `AuthenticationService` with an
OIDC/Entra implementation that validates an external token and resolves the officer and tenant; the
rest of the application is unchanged.

---

## Running locally

### Prerequisites
- .NET SDK **11** (the repository targets `net11.0`)
- Node.js 24+ and **pnpm** 10+

### One command

```bash
./scripts/dev.sh
```

- Web: http://localhost:3000
- API: http://localhost:5189
- Health: http://localhost:5189/health

### Manually

```bash
# terminal 1 — API (creates and seeds vantage.db on first run)
dotnet run --project src/Vantage.Api --urls http://localhost:5189

# terminal 2 — web
cd web
pnpm install
pnpm dev
```

The web app needs `API_URL` (defaults to `http://localhost:5189`). See `web/.env.example`.

### Demo credentials

Password for all demo accounts: `Passw0rd!2026`

| Force | Email | Role |
|---|---|---|
| WPC · Westshire Police | `sarah.collins@wpc.police.uk` | Supervisor (DS) |
| WPC · Westshire Police | `james.okoro@wpc.police.uk` | Officer (PC) |
| WPC · Westshire Police | `priya.nair@wpc.police.uk` | Officer (DC) |
| NCP · North City Police | `alex.morgan@ncp.police.uk` | Supervisor (DI) |

The seed creates two forces so tenant isolation can be demonstrated side by side. Reset the demo by
stopping the API and deleting `src/Vantage.Api/vantage.db*`.

### Tests

```bash
dotnet test
cd web && pnpm lint && pnpm build
```

The test suite covers Levenshtein distance and normalisation, duplicate detection including typo and
word-order cases, review scheduling, tenant query filters, tenant stamping and automatic auditing.

---

## Key API endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/login` | Force code + email + password → JWT |
| `GET` | `/api/auth/me` | Current officer profile |
| `GET` | `/api/persons` | Search people |
| `POST` | `/api/persons` | Create person record |
| `GET` | `/api/persons/{id}` | Person file with episodes, people, places, notes, images |
| `GET` | `/api/persons/{id}/intelligence-report` | Aggregated individual intelligence report |
| `POST` | `/api/persons/{id}/associates` | Add person of interest |
| `POST` | `/api/persons/{id}/places` | Add place of interest |
| `POST` | `/api/persons/{id}/notes` | Add intelligence/background note |
| `POST` | `/api/persons/{id}/images` | Upload photograph (multipart) |
| `GET` | `/api/cases` | Filterable enquiry list |
| `POST` | `/api/cases` | Create enquiry with new or existing person |
| `GET` | `/api/cases/{id}` | Full case workspace |
| `POST` | `/api/cases/{id}/reviews` | Record supervisory review (supervisor+) |
| `POST` | `/api/cases/{id}/locate` | Mark as located |
| `POST` | `/api/cases/{id}/close` | Close enquiry |
| `POST` | `/api/cases/{id}/notify-local-authority` | Notify local authority |
| `POST` | `/api/cases/{id}/tasks` | Create task (duplicate-aware) |
| `POST` | `/api/cases/{id}/tasks/duplicate-check` | Check for similar tasks |
| `PATCH` | `/api/tasks/{id}/status` | Start/complete/cancel task |
| `POST` | `/api/cases/{id}/ifind` | Attach search consideration |
| `PATCH` | `/api/cases/{id}/ifind/{entryId}` | Update checklist item |
| `GET` | `/api/reports/dashboard` | Operational dashboard data |
| `GET` | `/api/reports/overview` | Stats, repeat people, hotspots |
| `GET` | `/api/reports/mpb-return?year=&quarter=` | MPB quarterly CSV |
| `GET` | `/api/cawns` | Warning notice register |
| `POST` | `/api/cawns` | Issue notice |
| `POST` | `/api/cawns/{id}/revoke` | Revoke notice |
| `GET` | `/api/ifind` | Search consideration catalogue |

All endpoints except login, tenant lookup and health require a bearer token.

---

## Security and production checklist

Implemented for the prototype:

- JWT validation with issuer/audience/signing key, expiry and minimal clock skew.
- Password hashing through ASP.NET Core Identity; demo password policy is stronger than the seeded
  password length requirement.
- Tenant claim guard plus EF global filters (defence in depth).
- Tenant-scoped supervisor policy for reviews.
- HttpOnly, SameSite cookie in the Next.js BFF; the browser never persists the JWT itself.
- File type/size validation (JPEG/PNG/WebP, 10MB) and randomised storage keys.
- Automatic immutable audit trail; no delete endpoints are exposed.
- Structured problem responses without leaking stack traces.

Before production:

- Replace the demo signing key with a managed secret and rotate keys.
- Terminate TLS, enable HSTS, add rate limiting and account lockout/ MFA.
- Integrate force SSO / Entra ID and authoritative rank/role mapping.
- Move images to object storage with antivirus scanning and retention rules.
- Add database migrations, backup/restore, point-in-time recovery and row-level security review.
- Add formal retention and disclosure controls aligned to force information management policy.
- Complete DPIA, security accreditation and penetration testing.
- Replace the local-authority and MPB stubs with accredited national/partner integrations.
- Add background job processing for notifications and report generation.
- Add observability (OpenTelemetry, structured audit export, alerting) and health probes.

---

## Roadmap

- Force administration UI (tenant provisioning, review intervals, branding).
- Case assignment, handover and task reassignment workflow.
- Full iFIND catalogue management and national update import.
- Real MPB return format and submission tracking.
- Public/partner portal for appeals and local authority notifications.
- Advanced search: geospatial radius search, associates of interest across cases, full-text notes.
- Reporting builder for saved force-level reports and scheduled distribution.
- Records management: retention schedules, review holds and disclosure packs.
