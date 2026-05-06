# Fumakilla QC

Full-stack QC dashboard:

- Frontend: Next.js 14 on port `3003`
- Backend: Express + Prisma on port `4003`
- Database: PostgreSQL `fumakilla_qc`

## Setup

```bash
createdb fumakilla_qc

cd backend
copy .env.example .env
npm install
npm run db:push
npm run db:seed
npm run dev

cd ../frontend
copy .env.local.example .env.local
npm install
npm run dev
```

Login awal:

```text
admin@fumakilla.co.id
fumakilla2026
```

## Verification

```bash
cd backend && npm run db:generate && npm run build
cd ../frontend && npm run type-check && npm run build
```
