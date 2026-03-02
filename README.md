# MeetFlow

## Project Description

![](/public/banner.jpeg)

Meet Flow is a meeting availability finder built with Next.js. Add members, mark their free time on a weekly grid (Mon–Fri, 9–17), and see overlapping slots so you can pick meeting times that work for everyone.

## Project Startup

### Prerequisites

- Node.js (v18+ recommended)
- npm, yarn, pnpm, or bun

### Install & run

```bash
# Install dependencies
npm install
# or: yarn | pnpm install | bun install

# Start development server
npm run dev
# or: yarn dev | pnpm dev | bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Other scripts

- `npm run build` — production build
- `npm run start` — run production server
- `npm run lint` — run ESLint

## Contributing

### Branch practices

- Work on **feature branches**, not directly on `main`.
- Branch names: `feat/<short-description>` or `fix/<short-description>` (e.g. `feature/add-export`, `fix/calendar-timezone`).
- Keep branches short-lived and up to date with `main` (rebase or merge as agreed).

### Commit practices

- Write **clear, present-tense** messages (e.g. "Add export to CSV", "Fix slot highlight on mobile").
- Prefer one logical change per commit.
- Reference issues/PRs when relevant (e.g. "Fix #12: overlapping slots on narrow screens").

---

This project uses [Next.js](https://nextjs.org) and was bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
