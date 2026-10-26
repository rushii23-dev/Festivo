# Festivo

> Plan the party, not the panic.

A GenAI-powered planning assistant that helps people organize weddings, birthdays and
community events with budgets, timelines, vendor checklists and personalized ideas.

This README is a working stub. The full write-up (feature-to-criteria map, architecture
diagram, deployment) is added in Phase 8.

## Quick start

```bash
npm install
cp .env.example .env.local   # AI_PROVIDER=mock works without any API key
npm run dev
```

## Scripts

| Script                  | What it does                                            |
| ----------------------- | ------------------------------------------------------- |
| `npm run dev`           | Start the dev server                                    |
| `npm run build`         | Production build                                        |
| `npm run lint`          | ESLint (Next, TypeScript, strict jsx-a11y), no warnings |
| `npm run format:check`  | Prettier check                                          |
| `npm run typecheck`     | Generate route types, then `tsc --noEmit`               |
| `npm test`              | Unit (Node) and component (jsdom) tests with Vitest     |
| `npm run test:coverage` | Tests with coverage; `lib/` must stay at 80% or more    |
| `npm run test:e2e`      | Playwright and axe against a production build           |

## Stack

Next.js 16 (App Router, Cache Components), React 19, TypeScript strict, Tailwind CSS 4,
shadcn/ui on Radix, Vitest, Testing Library, Playwright with axe-core.
