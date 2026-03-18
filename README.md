# CaféOS — Web-Based POS for Coffee Shops

CaféOS is a multi-tenant, web-based point-of-sale platform built for coffee shops. Shop owners register their business, choose a subscription plan, and get a fully operational POS with product management, stock control, income/expense tracking, and sales reporting — all in the browser, no installation required.

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Subscription Plans](#subscription-plans)
- [User Roles](#user-roles)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

CaféOS operates on two levels:

**Platform level (you — the system owner)**
- Manage all registered shops from a dedicated admin portal
- Create, edit, and price subscription packages
- Override sale quotas for any shop
- View cross-shop analytics and revenue reports

**Shop level (each coffee shop tenant)**
- Independent, isolated data per shop
- Full POS with real-time sale quota tracking
- Role-based access for owner, manager, cashier, and kitchen staff

---

## How It Works

1. A coffee shop visits the platform and registers their business.
2. They are assigned the **Free** plan by default — no payment required to start.
3. Every completed order counts as **1 sale** — regardless of how many items are in it (e.g. 3 cups of coffee in one order = 1 sale).
4. The sale counter is always visible in the dashboard header: `used / limit` with a monthly reset on the 1st.
5. When the monthly limit is reached, new sale creation is blocked and an upgrade prompt is shown. All other features (stock, menu, users) continue to work normally.
6. To upgrade, the shop owner contacts the platform owner via **in-app chat** or **Telegram**, pays via **KHQR**, and the platform owner manually activates the new plan from the admin portal.

> Payment API integration (Stripe, etc.) is planned for a future phase. The initial version uses a manual chat + KHQR flow.

---

## Subscription Plans

| Plan | Sale limit | Income/Expense | Reports | Export |
|------|-----------|----------------|---------|--------|
| Free | 500 / month | Locked | Basic only | Locked |
| Business | 5 000 / month | Included | Full | Included |
| Unlimited | No cap | Included | Full | Included |

All plans support multiple users (owner, manager, cashier, kitchen).

The platform owner can create new packages, adjust limits, and manually override a shop's quota at any time.

---

## User Roles

| Role | Scope | Key access |
|------|-------|-----------|
| Platform owner | System-wide | All shops, all packages, quota overrides |
| Shop owner | Own shop | Full access including billing and user management |
| Manager | Own shop | POS, products, stock, reports — no billing |
| Cashier | Own shop | Create sales, view menu and stock |
| Kitchen | Own shop | View orders only (kitchen display) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS |
| Backend | Next.js API Routes / tRPC |
| Database | MySQL 8+ with Prisma ORM |
| Auth | NextAuth.js (JWT + RBAC) |
| Hosting | Vercel (app) + PlanetScale or Railway (database) |
| PDF export | React-PDF or Puppeteer |
| Chat | Built-in DB-backed chat (polling); Telegram deep link for external contact |
| Payments | Manual KHQR (no payment API in v1) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8+
- npm or pnpm

### Installation

```bash
git clone https://github.com/your-org/cafeos.git
cd cafeos
npm install
```

### Database setup

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your database URL and secrets
# Then run migrations
npx prisma migrate dev
npx prisma db seed
```

### Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the shop portal.
Open [http://localhost:3000/admin](http://localhost:3000/admin) for the platform admin portal.

---

## Environment Variables

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/cafeos

# NextAuth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# Platform owner seed (for first-time setup)
PLATFORM_OWNER_EMAIL=admin@yourdomain.com
PLATFORM_OWNER_PASSWORD=changeme
```

---

## Project Structure

```
cafeos/
├── app/
│   ├── (admin)/          # Platform owner portal
│   ├── (shop)/           # Shop tenant portal
│   │   ├── pos/          # POS & sale creation
│   │   ├── products/     # Menu & categories
│   │   ├── stock/        # Inventory management
│   │   ├── income/       # Income & expense ledger
│   │   ├── reports/      # Sales reports & export
│   │   ├── users/        # Staff management
│   │   └── billing/      # Plan & quota info
│   └── api/              # API routes
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data
├── lib/
│   ├── auth.ts           # NextAuth config & RBAC
│   ├── quota.ts          # Sale quota engine
│   └── tenant.ts         # Multi-tenant helpers
├── components/
└── middleware.ts          # Route protection
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a pull request

Please follow the existing code style and include tests for new features.

---

## License

MIT © CaféOS. See [LICENSE](LICENSE) for details.
