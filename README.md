# Hospital Voice Agent Control Center

A private, non-production learning project for building a hospital operations
dashboard around synthetic Retell voice-agent calls and appointments.

This repository must contain only fictional hospital and patient information.
It is not approved for real clinical or emergency use.

## Requirements

- Node.js 24
- npm 11 or newer
- An isolated development Supabase project
- Isolated Retell test agents or the Retell browser playground

## Local setup

1. Clone the repository and enter it:

   ```bash
   git clone <repository-url>
   cd hvacc
   ```

2. Install the exact locked dependencies:

   ```bash
   npm ci
   ```

3. Create the local environment file:

   ```bash
   cp .env.example .env
   ```

4. Fill `.env` with development-only credentials. Never commit `.env`, service
   role keys, database passwords, or Retell keys.

5. Start the application:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local Next.js development server |
| `npm run lint` | Check ESLint and architectural import rules |
| `npm run typecheck` | Run strict TypeScript checking without emitting files |
| `npm run format` | Format application and configuration files |
| `npm run format:check` | Verify formatting without changing files |
| `npm run test:unit` | Run Vitest unit and integration tests once |
| `npm run test:unit:watch` | Run Vitest while developing |
| `npm run test:e2e` | Run Playwright browser tests |
| `npm run build` | Type-check and create the production build |
| `npm run check` | Run formatting, linting, types, unit tests, and build |

For the first local browser-test run, install Chromium once:

```bash
npx playwright install chromium
```

On Debian or Ubuntu, install its operating-system libraries as well:

```bash
sudo "$(command -v node)" "$(pwd)/node_modules/playwright/cli.js" install-deps chromium
```

## Repository structure

```text
hvacc/
├── .github/workflows/        Continuous-integration checks
├── docs/                     Architecture and engineering documentation
├── e2e/                      Playwright browser tests
├── public/                   Static browser assets
├── src/
│   ├── app/                  Next.js routes, layouts, and route states
│   ├── components/           Reusable layout and UI components
│   ├── features/             Product features grouped by capability
│   ├── lib/
│   │   ├── auth/             Authorization boundary (introduced in Module 3)
│   │   ├── db/               Database boundary (introduced in Module 2)
│   │   ├── env/              Server and browser environment validation
│   │   ├── integrations/     External-provider adapters
│   │   └── services/         Shared domain services
│   └── test/                 Shared test configuration and factories
├── kb.md                     Synthetic Retell knowledge base
├── m0.md                     Module 0 evidence and decisions
├── prd-docs.md               Product requirements
└── progress.md               Delivery roadmap
```

See [docs/architecture.md](docs/architecture.md) for dependency direction and
security boundaries.

## Git workflow

This learning project uses `main` as the stable branch.

1. Start work from an up-to-date `main` branch.
2. Create a short branch such as `feature/m1-foundation` or
   `fix/environment-validation`.
3. Keep commits focused and never commit credentials or real patient data.
4. Run `npm run check` before merging.
5. Review the changed files and CI result before merging into `main`.

Direct work on `main` is acceptable for small private-learning experiments, but
the checks and secret-review step still apply.

## Troubleshooting

### The page does not open

Check the address printed by `npm run dev`. If port 3000 is busy, Next.js may
choose another port. Stop the server with `Ctrl+C`.

### Environment validation fails

Compare `.env` with `.env.example`. Server-only values must not use a
`NEXT_PUBLIC_` prefix. Browser code can access only explicitly listed
`NEXT_PUBLIC_` variables.

### A build cannot download a font

The application uses system fonts and should not download fonts during builds.
If this returns, check for a new `next/font/google` import.

### Playwright cannot find a browser

Run:

```bash
npx playwright install chromium
```

If Chromium reports a missing shared library such as `libnspr4.so`, run:

```bash
sudo "$(command -v node)" "$(pwd)/node_modules/playwright/cli.js" install-deps chromium
```

This form works when Node was installed through NVM and `sudo` cannot find
`npx`. The system-level command may request your administrator password. The CI
workflow installs the same dependencies automatically on its disposable runner.

### Database commands are unavailable

Database migrations and deterministic seed commands are introduced in Module 2.
They are intentionally not part of the Module 1 foundation.
