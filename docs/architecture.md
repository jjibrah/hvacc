# Application structure

The repository uses feature-oriented folders. Indentation shows which files
belong to each part of the application.

```text
hvacc/
├── .github/
│   └── workflows/
│       └── ci.yml
├── docs/
│   └── architecture.md
├── e2e/
│   └── home.spec.ts
├── public/                       Static browser assets
├── src/
│   ├── app/                      Next.js routes and route-level states
│   │   ├── error.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── loading.tsx
│   │   ├── not-found.tsx
│   │   ├── page.tsx
│   │   └── providers.tsx
│   ├── components/               Reusable presentation components
│   │   ├── layout/
│   │   │   └── app-shell.tsx
│   │   └── ui/
│   │       ├── status-badge.test.tsx
│   │       └── status-badge.tsx
│   ├── features/                 User-facing product capabilities
│   │   └── dashboard/
│   │       └── components/
│   │           └── module-progress.tsx
│   ├── lib/                      Shared server and infrastructure code
│   │   ├── auth/                 Authorization helpers
│   │   ├── db/                   Drizzle and Supabase database code
│   │   ├── env/
│   │   │   ├── client.ts         Browser-safe validated variables
│   │   │   ├── parse-env.ts      Safe validation helper
│   │   │   ├── schema.test.ts    Environment validation tests
│   │   │   ├── schema.ts         Server and public schemas
│   │   │   └── server.ts         Server-only validated variables
│   │   ├── integrations/retell/  Retell provider boundary
│   │   └── services/             Cross-feature domain services
│   └── test/
│       └── setup.ts              Shared unit-test setup
├── .env.example                  Credential names without secrets
├── kb.md                         Synthetic Retell knowledge base
├── m0.md                         Module 0 evidence
├── prd-docs.md                   Product requirements
└── progress.md                   Implementation roadmap
```

Folders described above but not created yet are introduced when their
implementation module begins. This avoids placeholder production code while
preserving a clear target structure.

## Dependency direction

```text
app routes
  -> features
      -> reusable components
      -> domain services
          -> authorization / database / integrations
```

Browser components must not import database credentials, the Supabase service
role, the Retell API key, or server-only integration modules.
