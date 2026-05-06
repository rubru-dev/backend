# Fumakilla QC Dashboard — Full Stack Prompt untuk Claude Code

Stack: Next.js 14 (App Router) + Express.js + Prisma + PostgreSQL
Tidak ada dummy data. Tidak ada hardcode. Semua data dari database via API.

---

## IMPLEMENTATION FIXES APPLIED (2026-05-05)

1. Encoding harus UTF-8 bersih saat file dibuat; jangan salin karakter mojibake dari prompt lama ke UI/source code.
2. Auth frontend wajib validasi token ke `GET /api/auth/me`, bukan hanya percaya `localStorage`.
3. JWT payload distandarkan memakai `sub = user.id`; middleware mengambil user aktif dari database dan menolak user nonaktif.
4. Static uploads memakai `UPLOAD_DIR` absolut/ter-resolve, bukan path relatif `__dirname` yang berubah saat build ke `dist`.
5. Upload memakai limit ukuran file, MIME whitelist, nama file aman, dan folder dibuat otomatis.
6. OCR memakai upload limit dan endpoint terpisah; untuk produksi besar disarankan dinaikkan ke job queue bila file banyak.
7. Analytics `defect-trend` memakai raw SQL `date_trunc('week', ...)` agar group-by minggu benar di PostgreSQL.
8. Generate nomor NCR memakai retry saat unique conflict untuk mengurangi race condition concurrent create.
9. Delete inspection dicegah jika inspection sudah punya NCR; hanya parameter yang cascade delete.
10. Frontend memakai komponen state loading/empty, validasi token, dan form minimal terpusat agar tidak mengandalkan dummy data.

---

## ARSITEKTUR

```
VPS rubru.id
├── PM2: next-fumakilla-qc   → port 3003  (Next.js frontend)
├── PM2: api-fumakilla-qc    → port 4003  (Express backend)
└── PostgreSQL: fumakilla_qc (database terpisah dari rubru.id)

Nginx:
  qc.rubru.id        → proxy port 3003
  qc.rubru.id/api/*  → proxy port 4003
```

---

## STRUKTUR PROJECT

Generate dua folder terpisah dalam satu repo:

```
fumakilla-qc/
├── frontend/          ← Next.js 14
└── backend/           ← Express.js + Prisma
```

---

## BACKEND (`backend/`)

### Struktur

```
backend/
├── src/
│   ├── index.ts              ← entry point Express
│   ├── prisma.ts             ← Prisma client singleton
│   ├── middleware/
│   │   ├── auth.ts           ← JWT verify middleware
│   │   └── errorHandler.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── inspection.ts
│   │   ├── ocr.ts
│   │   ├── ncr.ts
│   │   ├── batch.ts
│   │   ├── document.ts
│   │   └── analytics.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── inspection.controller.ts
│   │   ├── ocr.controller.ts
│   │   ├── ncr.controller.ts
│   │   ├── batch.controller.ts
│   │   ├── document.controller.ts
│   │   └── analytics.controller.ts
│   └── lib/
│       └── generateNcrNumber.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts               ← seed data awal (admin user)
├── uploads/                  ← file upload storage
├── .env
├── package.json
└── tsconfig.json
```

### `backend/package.json`

```json
{
  "name": "fumakilla-qc-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.13.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "tesseract.js": "^5.0.5"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/multer": "^1.4.11",
    "@types/node": "^20",
    "prisma": "^5.13.0",
    "tsx": "^4.10.5",
    "typescript": "^5"
  }
}
```

### `backend/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String
  role      Role     @default(QC_OFFICER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  inspections  Inspection[]
  ocrDocuments OcrDocument[]
  ncrs         NCR[]
  documents    Document[]

  @@map("users")
}

enum Role {
  ADMIN
  QC_MANAGER
  QC_OFFICER
}

model Inspection {
  id           String           @id @default(cuid())
  type         InspectionType
  batchId      String?
  productName  String
  supplierName String?
  status       InspectionStatus @default(PENDING)
  notes        String?
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  officerId  String
  officer    User               @relation(fields: [officerId], references: [id])
  batch      Batch?             @relation(fields: [batchId], references: [id])
  parameters InspectionParameter[]
  ncrs       NCR[]

  @@map("inspections")
}

enum InspectionType {
  RAW_MATERIAL
  IN_PROCESS
  FINISHED_GOODS
}

enum InspectionStatus {
  PENDING
  PASS
  FAIL
  ON_HOLD
}

model InspectionParameter {
  id           String          @id @default(cuid())
  inspectionId String
  name         String
  unit         String?
  standardMin  Float?
  standardMax  Float?
  result       Float?
  resultText   String?
  status       ParameterStatus @default(PENDING)

  inspection Inspection @relation(fields: [inspectionId], references: [id], onDelete: Cascade)

  @@map("inspection_parameters")
}

enum ParameterStatus {
  PENDING
  PASS
  FAIL
}

model OcrDocument {
  id           String      @id @default(cuid())
  title        String
  category     OcrCategory
  originalFile String
  ocrText      String      @db.Text
  confidence   Float?
  pdfFile      String?
  status       OcrStatus   @default(DRAFT)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  uploadedById String
  uploadedBy   User        @relation(fields: [uploadedById], references: [id])

  @@map("ocr_documents")
}

enum OcrCategory {
  COA
  LABEL
  LAB_RESULT
  INSPECTION_FORM
  OTHER
}

enum OcrStatus {
  DRAFT
  REVIEWED
  APPROVED
  EXPORTED
}

model NCR {
  id           String    @id @default(cuid())
  ncrNumber    String    @unique
  productName  String
  batchId      String?
  inspectionId String?
  description  String    @db.Text
  severity     Severity  @default(MINOR)
  status       NCRStatus @default(OPEN)
  rootCause    String?   @db.Text
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  closedAt     DateTime?

  reportedById String
  reportedBy   User        @relation(fields: [reportedById], references: [id])
  batch        Batch?      @relation(fields: [batchId], references: [id])
  inspection   Inspection? @relation(fields: [inspectionId], references: [id])
  capas        CAPA[]

  @@map("ncrs")
}

enum Severity {
  CRITICAL
  MAJOR
  MINOR
}

enum NCRStatus {
  OPEN
  IN_PROGRESS
  CLOSED
}

model CAPA {
  id          String     @id @default(cuid())
  ncrId       String
  type        CAPAType
  description String     @db.Text
  dueDate     DateTime?
  status      CAPAStatus @default(OPEN)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  ncr NCR @relation(fields: [ncrId], references: [id], onDelete: Cascade)

  @@map("capas")
}

enum CAPAType {
  CORRECTIVE
  PREVENTIVE
}

enum CAPAStatus {
  OPEN
  IN_PROGRESS
  DONE
}

model Batch {
  id          String      @id @default(cuid())
  batchNumber String      @unique
  productName String
  productCode String?
  quantity    Float
  unit        String
  mfgDate     DateTime
  expDate     DateTime?
  status      BatchStatus @default(ACTIVE)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  rawMaterials BatchRawMaterial[]
  inspections  Inspection[]
  ncrs         NCR[]

  @@map("batches")
}

enum BatchStatus {
  ACTIVE
  RELEASED
  REJECTED
  QUARANTINE
}

model BatchRawMaterial {
  id           String @id @default(cuid())
  batchId      String
  materialName String
  supplierName String?
  lotNumber    String?
  quantity     Float
  unit         String

  batch Batch @relation(fields: [batchId], references: [id], onDelete: Cascade)

  @@map("batch_raw_materials")
}

model Document {
  id             String      @id @default(cuid())
  title          String
  category       DocCategory
  description    String?
  currentVersion Int         @default(1)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  authorId String
  author   User              @relation(fields: [authorId], references: [id])
  versions DocumentVersion[]

  @@map("documents")
}

enum DocCategory {
  SOP
  QUALITY_STANDARD
  PRODUCT_SPEC
  WORK_INSTRUCTION
  FORM_TEMPLATE
}

model DocumentVersion {
  id         String   @id @default(cuid())
  documentId String
  version    Int
  filePath   String
  changelog  String?
  createdAt  DateTime @default(now())

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@map("document_versions")
}
```

### `backend/.env`

```env
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/fumakilla_qc"
JWT_SECRET="fumakilla-qc-jwt-secret-ganti-ini"
PORT=4003
FRONTEND_URL="http://localhost:3003"
UPLOAD_DIR="./uploads"
```

### `backend/src/prisma.ts`

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

### `backend/src/index.ts`

```ts
import express from 'express'
import cors from 'cors'
import path from 'path'
import authRoutes from './routes/auth'
import inspectionRoutes from './routes/inspection'
import ocrRoutes from './routes/ocr'
import ncrRoutes from './routes/ncr'
import batchRoutes from './routes/batch'
import documentRoutes from './routes/document'
import analyticsRoutes from './routes/analytics'
import { errorHandler } from './middleware/errorHandler'

const app = express()
const PORT = process.env.PORT || 4003

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/inspection', inspectionRoutes)
app.use('/api/ocr', ocrRoutes)
app.use('/api/ncr', ncrRoutes)
app.use('/api/batch', batchRoutes)
app.use('/api/document', documentRoutes)
app.use('/api/analytics', analyticsRoutes)

app.get('/api/health', (_, res) => res.json({ status: 'ok', service: 'fumakilla-qc-api' }))

app.use(errorHandler)

app.listen(PORT, () => console.log(`API Fumakilla QC berjalan di port ${PORT}`))
```

### `backend/src/middleware/auth.ts`

```ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  user?: { id: string; role: string; name: string }
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token tidak ditemukan' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Token tidak valid' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role))
      return res.status(403).json({ error: 'Akses ditolak' })
    next()
  }
}
```

### `backend/src/middleware/errorHandler.ts`

```ts
import { Request, Response, NextFunction } from 'express'

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
}
```

### `backend/src/lib/generateNcrNumber.ts`

```ts
import prisma from '../prisma'

export async function generateNcrNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.nCR.count({
    where: { ncrNumber: { startsWith: `NCR-${year}-` } }
  })
  return `NCR-${year}-${String(count + 1).padStart(3, '0')}`
}
```

### ROUTES & CONTROLLERS

Buat semua routes dengan pattern `router.METHOD('/path', authenticate, controller)`.
Buat semua controllers dengan pattern async/await + try/catch yang memanggil `next(err)` saat error.

#### AUTH (`routes/auth.ts` + `controllers/auth.controller.ts`)

```
POST /api/auth/login
  body: { email, password }
  → bcrypt.compare password
  → return { token, user: { id, name, email, role } }

GET /api/auth/me  [authenticate]
  → return user dari req.user
```

#### INSPECTION

```
GET /api/inspection  [authenticate]
  query: type?, status?, search?, page=1, limit=20
  → prisma.inspection.findMany dengan filter + include officer + parameters
  → return { data, total, page, totalPages }

POST /api/inspection  [authenticate]
  body: { type, productName, supplierName?, batchId?, notes?, parameters[] }
  parameters[]: { name, unit, standardMin?, standardMax?, result?, resultText? }
  → hitung status tiap parameter otomatis:
      jika result ada: PASS jika standardMin <= result <= standardMax, else FAIL
      jika resultText ada: default PASS (user bisa override)
  → hitung status inspeksi: semua PASS → PASS, ada FAIL → FAIL, else ON_HOLD
  → prisma.inspection.create dengan parameters nested
  → return inspection lengkap

GET /api/inspection/:id  [authenticate]
  → prisma.inspection.findUnique include officer, parameters, batch
  → return detail lengkap

PUT /api/inspection/:id  [authenticate]
  body: { status?, notes? }
  → update inspection

DELETE /api/inspection/:id  [authenticate, requireRole('ADMIN', 'QC_MANAGER')]
  → prisma.inspection.delete (cascade hapus parameters)
```

#### OCR

```
POST /api/ocr/process  [authenticate]
  multipart/form-data: { image: File, lang: 'ind'|'eng'|'ind+eng' }
  → simpan file ke uploads/ dengan multer
  → jalankan Tesseract.js pada file
  → return { text, confidence, filePath }

POST /api/ocr  [authenticate]
  body: { title, category, originalFile, ocrText, confidence }
  → prisma.ocrDocument.create
  → return dokumen

GET /api/ocr  [authenticate]
  query: category?, status?, page=1, limit=20
  → return list dengan uploadedBy

GET /api/ocr/:id  [authenticate]
  → return detail

PUT /api/ocr/:id  [authenticate]
  body: { title?, ocrText?, status?, category? }
  → update

DELETE /api/ocr/:id  [authenticate]
  → delete
```

#### NCR

```
GET /api/ncr  [authenticate]
  query: severity?, status?, search?, page=1, limit=20
  → include reportedBy, capas, batch

POST /api/ncr  [authenticate]
  body: { productName, batchId?, inspectionId?, description, severity }
  → auto-generate ncrNumber via generateNcrNumber()
  → prisma.nCR.create

GET /api/ncr/:id  [authenticate]
  → include reportedBy, capas, batch, inspection

PUT /api/ncr/:id  [authenticate]
  body: { status?, rootCause?, description? }
  → jika status === 'CLOSED': set closedAt = new Date()

POST /api/ncr/:id/capa  [authenticate]
  body: { type, description, dueDate? }
  → prisma.cAPA.create

PUT /api/capa/:id  [authenticate]
  body: { status }
  → prisma.cAPA.update
```

#### BATCH

```
GET /api/batch  [authenticate]
  query: status?, search?, page=1, limit=20
  → include rawMaterials, _count { inspections, ncrs }

POST /api/batch  [authenticate]
  body: { batchNumber, productName, productCode?, quantity, unit, mfgDate, expDate?, rawMaterials[] }
  rawMaterials[]: { materialName, supplierName?, lotNumber?, quantity, unit }
  → prisma.batch.create dengan rawMaterials nested

GET /api/batch/:id  [authenticate]
  → include rawMaterials, inspections (include officer), ncrs (include reportedBy)

PUT /api/batch/:id/status  [authenticate, requireRole('ADMIN', 'QC_MANAGER')]
  body: { status }
  → update status batch
```

#### DOCUMENT

```
GET /api/document  [authenticate]
  query: category?, search?, page=1, limit=20
  → include author, versions (orderBy version desc)

POST /api/document  [authenticate]
  multipart/form-data: { title, category, description?, changelog?, file: File }
  → simpan file ke uploads/documents/
  → prisma.document.create dengan version 1
  → prisma.documentVersion.create { version: 1, filePath, changelog }

GET /api/document/:id  [authenticate]
  → include author, versions

POST /api/document/:id/version  [authenticate]
  multipart/form-data: { changelog?, file: File }
  → simpan file baru
  → prisma.documentVersion.create { version: currentVersion + 1 }
  → update document.currentVersion + 1

DELETE /api/document/:id  [authenticate, requireRole('ADMIN', 'QC_MANAGER')]
  → delete cascade
```

#### ANALYTICS

```
GET /api/analytics/overview  [authenticate]
  → return:
    {
      totalInspections: count 30 hari terakhir,
      passRate: (pass/total * 100) rounded,
      ncrOpen: count status OPEN,
      batchActive: count status ACTIVE atau QUARANTINE,
      recentNCRs: 3 NCR terbaru (OPEN/IN_PROGRESS duluan),
      recentInspections: 5 inspeksi terbaru
    }

GET /api/analytics/pass-rate  [authenticate]
  query: days=30
  → groupBy productName + status, hitung passRate per produk
  → return array { product, passRate, total, pass, fail, onHold }

GET /api/analytics/defect-trend  [authenticate]
  query: weeks=8
  → groupBy minggu + status FAIL, hitung count per minggu
  → return array { week, failCount, totalCount }
```

### `backend/prisma/seed.ts`

Seed hanya membuat 1 admin user:

```ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('fumakilla2026', 10)
  await prisma.user.upsert({
    where: { email: 'admin@fumakilla.co.id' },
    update: {},
    create: {
      name: 'Admin QC',
      email: 'admin@fumakilla.co.id',
      password,
      role: 'ADMIN',
    }
  })
  console.log('Seed selesai. Login: admin@fumakilla.co.id / fumakilla2026')
}

main().finally(() => prisma.$disconnect())
```

---

## FRONTEND (`frontend/`)

### Struktur

```
frontend/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx                    ← redirect ke /dashboard
│   ├── login/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── inspection/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── ocr/
│   │   ├── page.tsx
│   │   └── new/page.tsx
│   ├── ncr/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── batch/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   └── documents/
│       ├── page.tsx
│       └── new/page.tsx
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   └── page-header.tsx
│   └── ui/
│       ├── badge.tsx
│       ├── stat-card.tsx
│       ├── data-table.tsx
│       ├── pagination.tsx
│       ├── loading.tsx
│       └── empty-state.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useApi.ts
├── lib/
│   ├── api.ts                      ← axios instance + interceptors
│   └── utils.ts                    ← formatDate, getLabel, dll
├── types/
│   └── index.ts
├── .env.local
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

### `frontend/package.json`

```json
{
  "name": "fumakilla-qc-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev -p 3003",
    "build": "next build",
    "start": "next start -p 3003"
  },
  "dependencies": {
    "axios": "^1.7.2",
    "next": "14.2.35",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10",
    "postcss": "^8",
    "tailwindcss": "^3",
    "typescript": "^5"
  }
}
```

### `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4003
```

### `frontend/lib/api.ts`

```ts
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('fqc_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('fqc_token')
      localStorage.removeItem('fqc_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
```

### `frontend/hooks/useAuth.ts` — `'use client'`

```ts
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User { id: string; name: string; email: string; role: string }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('fqc_user')
    if (stored) setUser(JSON.parse(stored))
    setLoading(false)
  }, [])

  function logout() {
    localStorage.removeItem('fqc_token')
    localStorage.removeItem('fqc_user')
    router.push('/login')
  }

  return { user, loading, logout }
}
```

### `frontend/lib/utils.ts`

```ts
export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export const typeLabel: Record<string, string> = {
  RAW_MATERIAL: 'Bahan Baku', IN_PROCESS: 'In-Process', FINISHED_GOODS: 'Finished Goods'
}

export const categoryLabel: Record<string, string> = {
  COA: 'COA', LABEL: 'Label', LAB_RESULT: 'Hasil Lab',
  INSPECTION_FORM: 'Form Inspeksi', OTHER: 'Lainnya',
  SOP: 'SOP', QUALITY_STANDARD: 'Standar Mutu', PRODUCT_SPEC: 'Spesifikasi Produk',
  WORK_INSTRUCTION: 'Instruksi Kerja', FORM_TEMPLATE: 'Template Form',
}
```

---

## DESIGN SYSTEM (FRONTEND)

### `frontend/tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['IBM Plex Sans', 'sans-serif'] },
      colors: {
        accent: { DEFAULT: '#0F6E56', light: '#E1F5EE', dark: '#085041' },
        pass:   { DEFAULT: '#3B6D11', bg: '#EAF3DE' },
        fail:   { DEFAULT: '#A32D2D', bg: '#FCEBEB' },
        hold:   { DEFAULT: '#854F0B', bg: '#FAEEDA' },
        info:   { DEFAULT: '#185FA5', bg: '#E6F1FB' },
        surface: '#f7f7f5',
        bdr: '#e5e5e3',
        tp: '#1a1a18',
        ts: '#6b6b68',
        tm: '#9d9d9a',
      },
      borderRadius: { DEFAULT: '6px' },
    },
  },
  plugins: [],
}
```

### `frontend/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; }
body { font-family: 'IBM Plex Sans', sans-serif; background: #f7f7f5; color: #1a1a18; }

.sidebar-link {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 16px; border-radius: 6px; font-size: 13px;
  color: #6b6b68; text-decoration: none; transition: all 0.1s;
}
.sidebar-link:hover { background: #f0f0ef; color: #1a1a18; }
.sidebar-link.active {
  background: #E1F5EE; color: #0F6E56;
  border-left: 3px solid #0F6E56; padding-left: 13px; font-weight: 500;
}

.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 500;
  cursor: pointer; border: 1px solid #e5e5e3; background: white;
  color: #1a1a18; transition: background 0.1s; text-decoration: none;
}
.btn:hover { background: #f7f7f5; }
.btn-primary { background: #0F6E56; color: white; border-color: #0F6E56; }
.btn-primary:hover { background: #085041; }
.btn-danger { background: #FCEBEB; color: #A32D2D; border-color: #A32D2D; }
.btn-danger:hover { background: #f7c1c1; }

table { width: 100%; border-collapse: collapse; }
thead tr { background: #f7f7f5; border-bottom: 1px solid #e5e5e3; }
th { padding: 10px 14px; font-size: 11px; font-weight: 500; color: #6b6b68; text-align: left; letter-spacing: 0.05em; text-transform: uppercase; }
td { padding: 12px 14px; font-size: 13px; color: #1a1a18; border-bottom: 1px solid #e5e5e3; }
tbody tr:last-child td { border-bottom: none; }
tbody tr.clickable:hover { background: #f7f7f5; cursor: pointer; }

input, select, textarea {
  width: 100%; padding: 8px 12px; border: 1px solid #e5e5e3;
  border-radius: 6px; font-size: 13px; font-family: inherit;
  background: white; color: #1a1a18; outline: none;
}
input:focus, select:focus, textarea:focus { border-color: #0F6E56; box-shadow: 0 0 0 2px #E1F5EE; }

.card { background: white; border: 1px solid #e5e5e3; border-radius: 8px; }
.form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.form-label { font-size: 12px; font-weight: 500; color: #6b6b68; }
.form-error { font-size: 11px; color: #A32D2D; margin-top: 4px; }
```

---

## HALAMAN FRONTEND

### `app/login/page.tsx` — `'use client'`

Form login dengan email + password. Pada submit:
1. POST ke `/api/auth/login`
2. Simpan token ke `localStorage.setItem('fqc_token', data.token)`
3. Simpan user ke `localStorage.setItem('fqc_user', JSON.stringify(data.user))`
4. `router.push('/dashboard')`

Tampilan: centered card, logo "FQC" besar warna accent di atas, subtitle "Quality Control System — PT. Fumakilla Indonesia".

### `app/layout.tsx`

Cek token di localStorage. Jika tidak ada dan bukan halaman `/login`, redirect ke `/login`.
Gunakan `usePathname` untuk skip sidebar di halaman login.
Load IBM Plex Sans dari Google Fonts di `<head>`.

### `app/dashboard/page.tsx` — `'use client'`

Fetch `GET /api/analytics/overview` saat mount. Tampilkan loading state selama fetch.

Layout:
1. PageHeader "Dashboard"
2. Grid 4 stat-card: Total Inspeksi, Pass Rate (%), NCR Open, Batch Aktif
3. Grid 2 kolom:
   - Fetch `GET /api/analytics/pass-rate` → bar chart horizontal per produk (div, bukan library)
   - List 3 NCR terbaru dari overview response
4. Tabel 5 inspeksi terbaru dari overview response

### `app/inspection/page.tsx` — `'use client'`

State: filters (type, status, search), page.
Fetch `GET /api/inspection?type=&status=&search=&page=&limit=20` setiap kali filter/page berubah.
Tampilkan loading skeleton saat fetch.

PageHeader dengan link "Inspeksi Baru" → `/inspection/new`.
Filter bar: 3 elemen (dropdown type, dropdown status, input search).
Tabel dengan pagination.

### `app/inspection/new/page.tsx` — `'use client'`

Form multi-section:
1. Info umum: productName (input), type (select), supplierName (input optional), batchId (select dari list batch yang di-fetch), notes (textarea optional)
2. Parameter uji: tabel dinamis. Tombol "+ Tambah Parameter". Tiap baris: name, unit, standardMin, standardMax, result, resultText. Baris bisa dihapus.

Submit → POST `/api/inspection`. Redirect ke `/inspection/${id}` jika berhasil.

### `app/inspection/[id]/page.tsx` — `'use client'`

Fetch `GET /api/inspection/:id`. Loading state.

Tampilkan: header info, tabel parameter (baris FAIL bg merah muda), notes, badge status besar.
Jika status FAIL: banner "Buat NCR" → link ke `/ncr/new?inspectionId=${id}&product=${productName}`.
Tombol "Hapus" (hanya role ADMIN/QC_MANAGER) → konfirmasi → DELETE → redirect.

### `app/ocr/page.tsx` — `'use client'`

Fetch `GET /api/ocr` dengan filter category + status.
Grid 3 kolom kartu. Tiap kartu: category badge, status badge, judul, confidence bar, uploader + tanggal, tombol "Lihat".
"Lihat" toggle expand teks OCR inline di bawah kartu (max-height 150px scroll).

### `app/ocr/new/page.tsx` — `'use client'`

Step 1 — Upload:
- Drop zone + input file
- Select bahasa OCR (Indonesia / English / Campuran)
- Tombol "Proses OCR"
- Pada klik: FormData → POST `/api/ocr/process` → loading state → dapat hasil text + confidence

Step 2 — Review:
- Textarea hasil OCR (editable)
- Confidence badge
- Form: title, category
- Tombol "Simpan Dokumen" → POST `/api/ocr` body {title, category, originalFile, ocrText, confidence} → redirect ke `/ocr`

### `app/ncr/page.tsx` — `'use client'`

Fetch `GET /api/ncr` dengan filter severity + status + search + page.
PageHeader dengan link "NCR Baru" → `/ncr/new`.
Summary strip: angka total, open, in-progress, closed.
Tabel dengan pagination. Row klik ke `/ncr/${id}`.

### `app/ncr/new/page.tsx` — `'use client'`

Baca query params `inspectionId` dan `product` (pre-fill jika datang dari halaman inspeksi).
Form: productName, batchId (select), inspectionId (input readonly jika dari query), description (textarea), severity (select).
Submit → POST `/api/ncr` → redirect ke `/ncr/${id}`.

### `app/ncr/[id]/page.tsx` — `'use client'`

Fetch `GET /api/ncr/:id`. Loading state.

Section: header info cards, deskripsi, root cause (textarea editable + tombol simpan → PUT `/api/ncr/:id`).

CAPA section: tabel + tombol "+ Tambah CAPA" (inline form: type select, description textarea, dueDate).
Submit CAPA → POST `/api/ncr/:id/capa` → refresh data.
Status CAPA bisa diklik toggle → PUT `/api/capa/:id` → refresh.

Status NCR: tombol update status (OPEN → IN_PROGRESS → CLOSED) → PUT `/api/ncr/:id`.
Timeline visual vertikal 3 titik.

### `app/batch/page.tsx` — `'use client'`

Fetch `GET /api/batch` dengan filter status + search + page.
PageHeader dengan link "Batch Baru" → `/batch/new`.
Tabel: batchNumber, productName, qty+unit, mfgDate, expDate, status badge, jumlah inspeksi, jumlah NCR. Row klik ke `/batch/${id}`.

### `app/batch/new/page.tsx` — `'use client'`

Form multi-section:
1. Info batch: batchNumber, productName, productCode, quantity, unit (select: pcs/kg/L/botol/kaleng/tablet), mfgDate, expDate, status (default ACTIVE)
2. Bahan baku: tabel dinamis. Tombol "+ Tambah Bahan Baku". Tiap baris: materialName, supplierName, lotNumber, quantity, unit. Bisa dihapus.

Submit → POST `/api/batch` → redirect ke `/batch/${id}`.

### `app/batch/[id]/page.tsx` — `'use client'`

Fetch `GET /api/batch/:id`.

Header: batchNumber besar, badges status, info cards.

Traceability visual 3 kolom (flex row):
```
[Bahan Baku]  →  [Proses]        →  [Output]
list material    batchNumber         qty + unit
per item         mfgDate - expDate   productName
                 N inspeksi          status badge
                 N NCR
```

Tabel inspeksi terkait batch (data dari response batch).
Tabel NCR terkait batch.

Tombol update status (hanya ADMIN/QC_MANAGER): select status → PUT `/api/batch/:id/status`.

### `app/documents/page.tsx` — `'use client'`

Fetch `GET /api/document` dengan filter category + search + page.
PageHeader dengan link "Upload Dokumen" → `/documents/new`.
Tabel: judul, kategori badge, versi (v{n}), author, tanggal update. Row klik expand inline versi history + tombol download per versi + tombol "Upload Versi Baru" (arahkan ke form versi baru).

### `app/documents/new/page.tsx` — `'use client'`

Form: title, category (select), description (textarea), changelog versi 1 (input), file upload (input type file, accept pdf/doc/docx).
Submit: FormData → POST `/api/document` multipart → redirect ke `/documents`.

---

## KOMPONEN UI

### `components/ui/badge.tsx`
Sama persis seperti yang sudah didefinisikan di prompt sebelumnya — warna per status, severity, type, category, doc.

### `components/ui/stat-card.tsx`
Props: label, value, sub?, accent?

### `components/ui/loading.tsx`
Spinner sederhana: `<div className="animate-spin w-5 h-5 border-2 border-bdr border-t-accent rounded-full" />`
Juga buat `<PageLoading />` — centered di halaman dengan teks "Memuat data..."

### `components/ui/empty-state.tsx`
Props: message: string, action?: ReactNode
Tampilan centered dengan ikon sederhana (SVG inbox/folder) dan teks.

### `components/ui/pagination.tsx`
Props: page, totalPages, onPageChange
Tombol Prev / angka halaman / Next. Disable prev jika page=1, disable next jika page=totalPages.

### `components/ui/data-table.tsx`
Props: columns, data, onRowClick?, loading?
Jika loading: tampilkan skeleton rows. Jika data kosong: `<EmptyState />`.

### `components/layout/sidebar.tsx` — `'use client'`
useAuth() untuk nama user + role + logout.
usePathname() untuk active state menu.
Logo "FQC" + subtitle "Quality Control System".
Menu: Dashboard, Inspeksi, OCR Dokumen, Non-Conformance, Batch Tracking, Dokumen & SOP.
Footer: avatar inisial, nama user, role, tombol Logout.

### `components/layout/page-header.tsx`
Props: title, subtitle?, action?

---

## SETUP & JALANKAN

Setelah semua file dibuat, jalankan dalam urutan ini:

```bash
# 1. Setup database
createdb fumakilla_qc   # atau via psql

# 2. Backend setup
cd backend
npm install
npx prisma db push
npx tsx prisma/seed.ts
npm run dev             # port 4003

# 3. Frontend setup (terminal baru)
cd frontend
npm install
npm run dev             # port 3003
```

Login pertama: `admin@fumakilla.co.id` / `fumakilla2026`

---

## DEPLOY KE VPS (PM2 + NGINX)

### PM2

```bash
# Backend
cd /var/www/fumakilla-qc/backend
npm run build
pm2 start dist/index.js --name "api-fumakilla-qc"

# Frontend
cd /var/www/fumakilla-qc/frontend
npm run build
pm2 start npm --name "next-fumakilla-qc" -- start
pm2 save
```

### Nginx

```nginx
server {
  listen 80;
  server_name qc.rubru.id;

  location /api/ {
    proxy_pass http://localhost:4003;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location /uploads/ {
    alias /var/www/fumakilla-qc/backend/uploads/;
  }

  location / {
    proxy_pass http://localhost:3003;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

### `.env` production backend

```env
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/fumakilla_qc"
JWT_SECRET="ganti-dengan-random-string-panjang"
PORT=4003
FRONTEND_URL="https://qc.rubru.id"
UPLOAD_DIR="/var/www/fumakilla-qc/backend/uploads"
```

### `.env.local` production frontend

```env
NEXT_PUBLIC_API_URL=https://qc.rubru.id/api
```

---

## URUTAN GENERATE FILE

Generate dalam urutan ini agar tidak ada import error:

**Backend:**
1. `backend/package.json`, `backend/tsconfig.json`, `backend/.env`
2. `backend/prisma/schema.prisma`
3. `backend/src/prisma.ts`
4. `backend/src/middleware/auth.ts`
5. `backend/src/middleware/errorHandler.ts`
6. `backend/src/lib/generateNcrNumber.ts`
7. Semua controllers (auth, inspection, ocr, ncr, batch, document, analytics)
8. Semua routes
9. `backend/src/index.ts`
10. `backend/prisma/seed.ts`

**Frontend:**
1. `frontend/package.json`, config files, `.env.local`
2. `frontend/types/index.ts`
3. `frontend/lib/api.ts`, `frontend/lib/utils.ts`
4. `frontend/hooks/useAuth.ts`
5. `frontend/app/globals.css`
6. `frontend/tailwind.config.js`, `postcss.config.js`, `next.config.js`
7. `frontend/components/ui/` semua
8. `frontend/components/layout/` semua
9. `frontend/app/layout.tsx`
10. `frontend/app/page.tsx`
11. `frontend/app/login/page.tsx`
12. Semua halaman app/ dari dashboard → documents

Setelah semua file dibuat:
```bash
cd backend && npm install && npx prisma generate && npm run build
cd ../frontend && npm install && npm run build
```
Perbaiki semua TypeScript error sampai kedua build berhasil tanpa error.

---

*Fumakilla QC Dashboard — full stack, data real, siap production*
