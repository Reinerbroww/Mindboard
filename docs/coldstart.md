# COLDSTART — Mindboard

> Dokumen konteks utama untuk pengembangan Mindboard.
> Semua keputusan di bawah ini berasal dari STEP 1–5 yang sudah disetujui.
> Jangan menambah fitur atau mengganti teknologi utama tanpa persetujuan.

---

# 1. Project Overview

## Nama

Mindboard

## Kategori

AI-powered learning web application.

## Konsep

Mindboard membantu mahasiswa mengubah materi pembelajaran berupa teks atau PDF menjadi mind map interaktif di dalam whiteboard digital.

Alur utama:

Material
→ AI Analysis
→ Knowledge Map
→ Interactive Whiteboard
→ Explore
→ Explain / Expand
→ Save

Mindboard bukan sekadar generator mind map. Fokus produk adalah menyediakan ruang belajar interaktif untuk membuat, mengeksplorasi, dan mengembangkan struktur materi.

---

# 2. Masalah yang Diselesaikan

Mahasiswa sering menggunakan mind map untuk membantu merangkum dan memahami materi kuliah.

Namun, membuat mind map dari materi seperti PDF atau teks masih sering dilakukan secara manual.

Mahasiswa perlu:

1. Membaca materi.
2. Menentukan konsep penting.
3. Menentukan konsep utama dan sub-konsep.
4. Menentukan hubungan antar konsep.
5. Menyusun struktur mind map.
6. Menggambar atau menyusun mind map secara manual.

Proses tersebut membutuhkan waktu dan usaha, terutama ketika materi cukup panjang.

Mindboard mengotomatisasi proses tersebut menggunakan AI.

---

# 3. Target User

Target utama:

Mahasiswa yang menggunakan mind map sebagai salah satu metode belajar dan ingin membuat rangkuman visual dari materi kuliah dengan lebih cepat.

Contoh:

Mahasiswa mendapatkan PDF materi Machine Learning.

Daripada membaca materi kemudian membuat mind map dari awal secara manual, mahasiswa memasukkan PDF ke Mindboard.

Mindboard mengekstrak materi, menganalisis konsep, menghasilkan struktur knowledge map, lalu menampilkannya sebagai whiteboard interaktif.

---

# 4. Product Value

Mindboard membantu mahasiswa:

- Mengurangi waktu membuat mind map secara manual.
- Melihat gambaran besar materi.
- Menemukan konsep utama dan hubungan antar konsep.
- Mengeksplorasi konsep tertentu.
- Mendapatkan penjelasan berdasarkan materi yang digunakan.
- Mengembangkan konsep tertentu tanpa membuat ulang mind map.

Prinsip:

> Less information, more understanding.

---

# 5. PRD — Fitur MVP

## 5.1 Input Material

User dapat memasukkan:

- Teks
- PDF

## 5.2 AI Mind Map Generation

AI menganalisis materi dan menghasilkan:

- Konsep utama
- Sub-konsep
- Hubungan antar konsep

Mind map memprioritaskan konsep utama terlebih dahulu.

Detail dapat dikembangkan melalui Expand.

## 5.3 Interactive Whiteboard

Mind map ditampilkan sebagai objek interaktif.

User dapat:

- Zoom
- Pan
- Memilih konsep
- Memindahkan konsep

## 5.4 Explain & Expand

Explain:
AI menjelaskan konsep yang dipilih berdasarkan materi sumber.

Expand:
AI mengembangkan konsep yang dipilih menjadi sub-konsep baru.

## 5.5 Save Learning Map

User dapat menyimpan mind map dan membukanya kembali dari Dashboard.

---

# 6. Out of Scope MVP

Jangan implementasikan fitur berikut tanpa approval:

- Real-time collaboration
- Multiplayer whiteboard
- Mobile application khusus
- Voice input
- Social features
- Gamification
- Public marketplace
- Advanced learning analytics
- Public sharing
- Comments
- Notifications
- Chat system umum
- Vector database / complex RAG pipeline

---

# 7. User Persona

## Persona

Nama contoh: Raka Pratama

Status: Mahasiswa

Profil:

Mahasiswa yang sering mendapatkan materi kuliah dalam bentuk PDF atau teks dan menggunakan mind map sebagai metode untuk merangkum materi.

Kebutuhan:

- Membuat mind map lebih cepat.
- Mengurangi pekerjaan manual.
- Melihat konsep utama dan hubungan antar konsep.
- Mengeksplorasi bagian tertentu secara lebih mendalam.

Masalah utama:

Membaca materi, menentukan konsep, menyusun hubungan, dan menggambar mind map secara manual membutuhkan waktu dan usaha.

Tujuan:

Mengubah materi kuliah menjadi mind map interaktif secara otomatis dan kemudian mengeksplorasinya.

---

# 8. User Flow

Landing Page
→ Login / Register
→ Dashboard
→ Create New Map
→ Input Material
→ Upload PDF / Paste Text
→ Generate Mind Map
→ AI Processing
→ Interactive Whiteboard
→ Explore Mind Map
→ Select Concept
→ Explain / Expand
→ Save Map
→ Dashboard

---

# 9. Pages

MVP memiliki halaman:

1. Landing Page
2. Login
3. Register
4. Dashboard
5. Create New Map
6. AI Processing
7. Interactive Whiteboard

---

# 10. Wireframe Rules

Wireframe berfokus pada struktur dan fungsi, bukan visual final.

## Landing

Elemen:

- Logo / nama Mindboard
- Login
- Headline
- Deskripsi
- Get Started

## Login

Elemen:

- Email
- Password
- Login
- Register

## Register

Elemen:

- Name
- Email
- Password
- Register
- Login

## Dashboard

Elemen:

- Header
- Profile / Logout
- My Learning Maps
- Create New Map
- Daftar map
- Open

Dashboard tidak boleh berubah menjadi dashboard statistik yang ramai.

## Create New Map

Elemen:

- Back
- Upload PDF
- Paste Text
- Generate Mind Map

## AI Processing

Status:

1. Reading your material...
2. Finding key concepts...
3. Understanding relationships...
4. Building your knowledge map...
5. Drawing your mind map...

## Interactive Whiteboard

Elemen:

- Back to Dashboard
- Map title
- Save
- Canvas
- Nodes
- Connections
- Zoom controls
- Fit Map

Ketika node dipilih:

- Explain
- Expand

---

# 11. Database Schema

Database:

PostgreSQL melalui Supabase.

## users

| Column | Type | Key |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(100) | |
| email | VARCHAR(255) | UNIQUE |
| password_hash | TEXT | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

Catatan implementasi:

Supabase Auth menangani credential/password authentication. Jangan menyimpan password plaintext sendiri.

## maps

| Column | Type | Key |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id |
| title | VARCHAR(255) | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

## materials

| Column | Type | Key |
|---|---|---|
| id | UUID | PK |
| map_id | UUID | FK → maps.id |
| type | VARCHAR(20) | text/pdf |
| content | TEXT | |
| file_name | VARCHAR(255) | nullable |
| created_at | TIMESTAMP | |

## nodes

| Column | Type | Key |
|---|---|---|
| id | UUID | PK |
| map_id | UUID | FK → maps.id |
| parent_id | UUID | FK → nodes.id, nullable |
| label | VARCHAR(255) | |
| description | TEXT | nullable |
| position_x | FLOAT | |
| position_y | FLOAT | |
| level | INTEGER | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

## edges

| Column | Type | Key |
|---|---|---|
| id | UUID | PK |
| map_id | UUID | FK → maps.id |
| source_node_id | UUID | FK → nodes.id |
| target_node_id | UUID | FK → nodes.id |
| relationship | VARCHAR(100) | nullable |
| created_at | TIMESTAMP | |

## Relationships

User 1:N Maps

Map 1:N Materials

Map 1:N Nodes

Map 1:N Edges

Node 1:N Child Nodes melalui parent_id

Edges menghubungkan source node dan target node.

---

# 12. Locked Core Tech Stack

Stack wajib dari SOP:

| Layer | Technology | Fungsi |
|---|---|---|
| Framework | Next.js | Full-stack web framework |
| UI Library | React | Komponen dan interaksi UI |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Styling UI |
| Database | PostgreSQL | Penyimpanan data |
| Backend Database Platform | Supabase | PostgreSQL + Auth + Storage |

Gunakan Next.js App Router.

Jangan mengganti stack utama tanpa approval.

---

# 13. Frontend UI System

## Component System

Gunakan:

- Tailwind CSS
- shadcn/ui untuk komponen UI dasar jika diperlukan
- Lucide React untuk icon

shadcn/ui digunakan secara selektif, bukan untuk membuat halaman penuh kartu atau komponen yang berlebihan.

## Icons

Library:

`lucide-react`

Gunakan icon yang sederhana dan konsisten.

Hindari icon dekoratif yang tidak memiliki fungsi.

---

# 14. Interactive Whiteboard

## Library

Gunakan:

`@xyflow/react`

React Flow digunakan sebagai engine whiteboard/node-based UI.

Fitur yang digunakan:

- Node rendering
- Edge rendering
- Dragging node
- Zoom
- Pan
- Node selection
- Edge connections
- Fit view
- Custom node components

React Flow memang menyediakan dragging, zooming, panning, dan selection sebagai kemampuan bawaan.

## Data Model

Setiap konsep = Node.

Setiap hubungan = Edge.

Contoh:

Machine Learning
├── Supervised Learning
│   ├── Classification
│   └── Regression
└── Unsupervised Learning
    ├── Clustering
    └── Dimensionality Reduction

## Custom Node

Node Mindboard tidak menggunakan tampilan default library.

Custom node harus mengikuti visual Calm Minimal:

- Rounded
- Clean
- Banyak whitespace
- Label jelas
- Tidak terlalu banyak informasi
- Fokus pada konsep

---

# 15. Automatic Mind Map Layout

## Library

Gunakan:

`@dagrejs/dagre`

Dagre digunakan untuk menghitung posisi node secara otomatis berdasarkan hubungan graph.

## Teknik

Gunakan hierarchical graph layout.

Default:

Top-to-Bottom.

Root concept berada di bagian atas/tengah, kemudian konsep turun ke level berikutnya.

Contoh:

Root
↓
Main Concepts
↓
Sub Concepts
↓
Detailed Concepts

Dagre bertugas menghitung posisi.

React Flow bertugas merender dan menginteraksikan hasil layout.

Jangan membuat algoritma layout sendiri untuk MVP.

---

# 16. AI Layer

## AI SDK

Gunakan:

`ai`

AI SDK digunakan sebagai abstraction layer untuk komunikasi dengan model.

## Provider

Gunakan:

`@ai-sdk/google`

Provider AI utama:

Google Gemini.

Model ID harus disimpan dalam environment variable atau configuration sehingga dapat diganti tanpa mengubah banyak kode.

Contoh konfigurasi:

`GEMINI_MODEL=gemini-2.5-flash`

Model dapat diganti jika kebutuhan atau availability berubah.

## Kenapa AI SDK

AI SDK digunakan agar:

- Integrasi model lebih terstruktur.
- Structured output lebih mudah.
- Provider dapat diganti di masa depan.
- Logic AI tidak tersebar di banyak komponen UI.

---

# 17. Structured AI Output

Jangan meminta AI menghasilkan mind map sebagai teks bebas.

Gunakan structured output.

Library:

`zod`

AI harus menghasilkan object terstruktur yang divalidasi schema.

Contoh struktur konseptual:

```text
{
  title,
  nodes: [
    {
      id,
      label,
      description,
      level,
      parentId
    }
  ],
  edges: [
    {
      source,
      target,
      relationship
    }
  ]
}
```

Teknik:

AI → Structured JSON → Zod Validation → Application Logic → React Flow

Tujuannya agar output AI dapat langsung diproses oleh aplikasi dan tidak bergantung pada parsing Markdown atau teks bebas.

---

# 18. AI Mind Map Generation Technique

Pipeline:

1. User memasukkan material.
2. Server menerima material.
3. Jika PDF, extract text.
4. Normalisasi text.
5. Kirim material ke AI.
6. AI menentukan konsep utama.
7. AI menentukan sub-konsep.
8. AI menentukan hubungan antar konsep.
9. AI menghasilkan structured output.
10. Zod melakukan validation.
11. Server menyimpan nodes dan edges.
12. React Flow merender graph.
13. Dagre menghitung layout.
14. User melihat whiteboard.

## Important Rule

AI tidak boleh membuat konsep yang tidak didukung materi hanya untuk membuat map terlihat lebih lengkap.

Prompt harus menekankan:

- Gunakan informasi dari material.
- Prioritaskan konsep penting.
- Hindari memasukkan konsep yang tidak relevan.
- Jangan membuat terlalu banyak node.
- Hubungan antar konsep harus masuk akal berdasarkan material.

---

# 19. PDF Processing

## Library

Gunakan:

`unpdf`

Fungsi:

PDF → Text

PDF parsing dilakukan di server.

## Pipeline

PDF upload
→ Validate file type
→ Validate file size
→ Extract text
→ Clean text
→ AI processing

## Security / Reliability

PDF adalah input tidak tepercaya.

Tetapkan batas:

- Ukuran file
- Jumlah halaman
- Processing timeout

Jangan mengirim file mentah langsung ke komponen client jika tidak diperlukan.

## MVP Limitation

MVP fokus pada PDF yang memiliki selectable text.

OCR untuk PDF hasil scan tidak termasuk MVP.

---

# 20. File Storage

Gunakan:

Supabase Storage.

PDF asli dapat disimpan di Storage jika diperlukan untuk membuka kembali sumber.

Database hanya menyimpan metadata dan/atau extracted content yang diperlukan.

Jangan menyimpan file PDF binary langsung di PostgreSQL.

Gunakan bucket dengan policy akses yang sesuai.

---

# 21. Authentication

Gunakan:

Supabase Auth.

Metode MVP:

- Email
- Password

Flow:

Register
→ Supabase Auth
→ User session
→ Dashboard

Login
→ Supabase Auth
→ User session
→ Dashboard

Gunakan server-side authentication pattern yang sesuai dengan Next.js App Router.

Jangan membuat sistem password hashing sendiri jika Supabase Auth sudah digunakan.

---

# 22. Database Security

Gunakan:

Supabase Row Level Security (RLS).

Aturan utama:

User hanya boleh membaca atau mengubah data miliknya sendiri.

Contoh:

User A tidak boleh membaca Map milik User B.

Policy harus diterapkan pada tabel yang berisi user-owned data.

Storage bucket juga harus memiliki access policy.

---

# 23. Explain Technique

Ketika user memilih node:

Node
→ Explain
→ Server mengambil material terkait
→ AI menerima material/context + konsep terpilih
→ AI menghasilkan penjelasan
→ UI menampilkan penjelasan

Penjelasan harus grounded pada materi yang digunakan untuk membuat map.

AI tidak boleh mengklaim bahwa informasi berasal dari materi jika informasi tersebut tidak tersedia di materi.

Untuk MVP, jangan membangun vector database/RAG kompleks.

Gunakan context dari material yang tersedia dan batasi panjang context agar request tetap efisien.

---

# 24. Expand Technique

Ketika user memilih:

Expand

Flow:

Selected Node
→ Ambil material/context
→ AI menganalisis konsep
→ AI menghasilkan child concepts
→ Zod validation
→ Simpan nodes baru
→ Simpan edges baru
→ Hitung ulang layout
→ Tambahkan nodes ke React Flow
→ Animate new nodes

Expand hanya boleh menghasilkan sub-konsep yang berhubungan dengan konsep yang dipilih.

---

# 25. Animation

## Library

Gunakan:

`motion`

Import utama:

`motion/react`

Motion digunakan untuk UI animation dan micro-interaction.

## AI Processing Animation

Gunakan staged animation:

1. Reading your material...
2. Finding key concepts...
3. Understanding relationships...
4. Building your knowledge map...
5. Drawing your mind map...

Teknik:

- Fade
- Opacity transition
- Small scale transition
- Stagger
- Layout animation
- SVG path animation jika diperlukan

Jangan menggunakan animasi berlebihan.

---

# 26. Mind Map Drawing Animation

Setelah AI selesai menghasilkan data:

1. Root node muncul.
2. Main concept nodes muncul bertahap.
3. Edges muncul.
4. Sub-concepts muncul.
5. Canvas melakukan smooth fit-to-view.

Teknik:

Staggered node reveal.

Tujuannya memberikan kesan bahwa Mindboard sedang "membangun" knowledge map.

Ini adalah animasi UI.

Jangan menampilkan atau mengklaim proses internal/reasoning model AI.

---

# 27. Interaction Animation

Gunakan Motion untuk:

- Node selection feedback
- Panel Explain muncul
- Panel Expand muncul
- Button hover/tap
- Save feedback
- Modal enter/exit
- Dashboard map cards
- Page transitions jika diperlukan

Gunakan CSS transition biasa untuk animasi yang sangat sederhana.

Jangan memakai Motion untuk semua elemen secara otomatis.

---

# 28. State Management

MVP tidak membutuhkan global state management yang kompleks.

Gunakan:

- React state
- React Flow state/hooks
- Server state melalui Server Components / Server Actions / Route Handlers sesuai kebutuhan
- URL state jika diperlukan

Jangan menambahkan Redux atau Zustand kecuali kompleksitas aplikasi benar-benar membutuhkan.

---

# 29. API / Backend Pattern

Gunakan kemampuan full-stack Next.js.

Pembagian:

## Server

- AI request
- PDF extraction
- Database access
- Authentication checks
- Save map
- Explain
- Expand

## Client

- Form interaction
- Whiteboard
- Node dragging
- Zoom/pan
- Selection
- Animation
- Temporary UI state

Jangan menaruh API key AI di client.

---

# 30. Validation

Gunakan:

`zod`

Validasi:

- Form input
- PDF metadata
- AI structured output
- Node data
- Edge data
- API payload

AI output harus divalidasi sebelum disimpan.

---

# 31. Responsive Design

Gunakan Tailwind CSS responsive utilities.

Desktop adalah prioritas utama karena whiteboard membutuhkan ruang besar.

Mobile tetap harus usable untuk:

- Landing
- Login
- Register
- Dashboard
- Create Map

Untuk whiteboard mobile, prioritaskan:

- Pan
- Zoom
- Node selection

Jangan memaksakan semua kontrol desktop ke layar kecil.

---

# 32. Design System

## Mood

Calm Minimal — Focused & Comfortable

## Principle

> Less information, more understanding.

## Colors

Primary:

`#2F6F5E`

Background:

`#F8FAF8`

Accent:

`#DCEFE8`

Text:

`#26332E`

Secondary Text:

`#718078`

## Typography

Gunakan system font / default Tailwind.

Tidak perlu custom font untuk MVP.

---

# 33. Visual Rules

Gunakan:

- Banyak whitespace
- Visual hierarchy jelas
- Satu primary action
- Progressive disclosure
- Panel hanya muncul saat dibutuhkan
- Elemen sederhana
- Soft interaction
- Canvas luas

Hindari:

- Dashboard ramai
- Terlalu banyak card
- Terlalu banyak warna
- Neon
- Cyberpunk
- Glassmorphism berlebihan
- Gradient berlebihan
- Animasi berlebihan
- Sidebar besar permanen
- Informasi yang tidak relevan

---

# 34. Dashboard Design Principle

Dashboard bukan halaman analytics.

Dashboard harus terasa seperti tempat melanjutkan proses belajar.

Prioritas:

1. Create New Map
2. Recent / saved maps
3. Open map

Jangan menambahkan:

- Statistik belajar
- Grafik
- Progress score
- Achievement
- Ranking

kecuali nanti masuk PRD.

---

# 35. Project Architecture

Gunakan struktur modular.

Contoh:

```text
src/
├── app/
│   ├── page.tsx
│   ├── login/
│   ├── register/
│   ├── dashboard/
│   ├── maps/
│   │   ├── new/
│   │   └── [id]/
│   └── api/
│       ├── generate-map/
│       ├── explain/
│       └── expand/
│
├── components/
│   ├── ui/
│   ├── whiteboard/
│   ├── dashboard/
│   ├── maps/
│   └── auth/
│
├── lib/
│   ├── ai/
│   ├── pdf/
│   ├── supabase/
│   ├── validation/
│   └── layout/
│
├── types/
│
└── styles/
```

Actual structure may adapt to Next.js conventions, but responsibilities must remain separated.

---

# 36. Environment Variables

Never hardcode secrets.

Expected environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
GEMINI_MODEL=
```

Do not commit `.env.local`.

---

# 37. Development Tools

## Primary Vibe Coding Agent

Use an AI coding agent capable of editing the project files and running the application.

Preferred options from the SOP:

- Antigravity
- OpenCode.ai CLI
- Bolt.new
- Lovable
- Replit AI App Builder

Choose one primary coding environment for implementation to avoid fragmented project state.

## Planning / Debugging

ChatGPT can be used for:

- Architecture decisions
- Debugging
- Root cause analysis
- Prompt refinement
- Documentation
- Code review

---

# 38. Version Control

Use:

Git + GitHub.

Repository should contain:

- Source code
- Database migration/schema files
- Documentation
- README
- Environment example file

Never commit:

- API keys
- Passwords
- `.env.local`
- Private credentials

---

# 39. Testing Strategy

Test the MVP feature by feature.

## Authentication

- Register
- Login
- Logout
- Invalid credentials
- Protected dashboard

## Material

- Paste text
- Upload PDF
- Invalid file
- Empty material
- Large material

## AI

- Generate map
- Invalid AI output
- Empty AI output
- API failure
- Timeout

## Whiteboard

- Nodes render
- Edges render
- Pan
- Zoom
- Drag node
- Select node
- Explain
- Expand
- Save

## Persistence

- Create map
- Save map
- Reopen map
- User isolation

---

# 40. Error Handling Principle

When an error occurs:

1. Reproduce the error.
2. Read the complete error.
3. Identify where it happens.
4. Find root cause.
5. Fix root cause.
6. Retest the affected flow.
7. Check for regression.

Do not blindly patch symptoms.

---

# 41. Performance Principles

Prioritize:

- Lazy loading for heavy whiteboard components where appropriate.
- Avoid unnecessary React re-renders.
- Keep AI processing on the server.
- Avoid sending oversized context to the model.
- Store PDFs in Storage rather than database blobs.
- Avoid rendering unnecessary UI elements.
- Animate transforms and opacity where practical.

---

# 42. AI Prompting Rules

AI prompts should be explicit about:

- Role
- Input material
- Expected output schema
- Number of concepts
- Relationship rules
- Grounding requirement
- Output constraints

AI must return machine-readable structured data for map generation.

Do not rely on parsing arbitrary Markdown.

---

# 43. MVP Node Limit

To prevent an overwhelming first view:

The initial AI-generated map should prioritize a manageable number of important concepts.

The exact node limit can be tuned during testing.

Do not generate an unnecessarily huge graph.

Detailed concepts should be discovered through Expand.

This implements the product principle of progressive knowledge exploration.

---

# 44. Progressive Knowledge Exploration

This is a product behavior, not a separate feature.

Initial state:

Main concepts and important relationships.

After user selects a concept:

Explain → understand the concept.

Expand → discover deeper sub-concepts.

This prevents the first whiteboard view from becoming visually overwhelming.

---

# 45. Core Technical Pipeline

```text
USER
  │
  ├── Paste Text
  │
  └── Upload PDF
          │
          ▼
     Input Validation
          │
          ▼
     PDF Text Extraction
       (unpdf)
          │
          ▼
     Material Normalization
          │
          ▼
     Gemini via AI SDK
          │
          ▼
     Structured Output
       (Zod schema)
          │
          ▼
   Nodes + Edges Validation
          │
          ▼
      PostgreSQL
       (Supabase)
          │
          ▼
    Dagre Auto Layout
          │
          ▼
   React Flow Whiteboard
          │
          ▼
       Motion UI
     Animations / Reveal
```

---

# 46. Tool & Library Summary

| Purpose | Tool / Library | Technique |
|---|---|---|
| Framework | Next.js | App Router / full-stack |
| UI | React | Component-based UI |
| Language | TypeScript | Static type safety |
| Styling | Tailwind CSS | Utility-first styling |
| UI Components | shadcn/ui | Minimal reusable components |
| Icons | Lucide React | Consistent icons |
| Database | PostgreSQL | Relational persistence |
| Backend Platform | Supabase | PostgreSQL + Auth + Storage |
| Authentication | Supabase Auth | Email/password session |
| Security | Supabase RLS | Row-level authorization |
| File Storage | Supabase Storage | PDF/object storage |
| AI SDK | Vercel AI SDK (`ai`) | Model abstraction + structured generation |
| AI Provider | `@ai-sdk/google` | Gemini integration |
| AI Validation | Zod | Structured output validation |
| PDF Processing | `unpdf` | PDF text extraction |
| Whiteboard | `@xyflow/react` | Interactive node graph |
| Graph Layout | `@dagrejs/dagre` | Automatic hierarchical layout |
| Animation | Motion | UI/micro-interactions/staged reveal |
| State | React state + React Flow state | Minimal state architecture |
| Version Control | Git + GitHub | Source control |
| Development | AI coding agent | Vibe coding |
| Deployment | Vercel | Next.js deployment |

---

# 47. Important Architectural Decisions

## Decision 1

React Flow is the whiteboard engine.

Do not build a custom canvas engine for MVP.

## Decision 2

Dagre handles automatic graph positioning.

Do not manually position every generated node.

## Decision 3

AI returns structured data.

Do not parse free-form AI Markdown to build the graph.

## Decision 4

Supabase handles database, authentication, and file storage.

Do not introduce another backend service for MVP.

## Decision 5

Motion handles meaningful animations.

Do not use multiple animation libraries.

## Decision 6

PDF processing happens server-side.

## Decision 7

No vector database or complex RAG pipeline in MVP.

## Decision 8

No global state library unless the application actually requires it.

## Decision 9

No feature outside the approved PRD without explicit approval.

---

# 48. Build Order

Implement in this order:

1. Next.js project setup
2. Tailwind + UI foundation
3. Supabase connection
4. Authentication
5. Database schema + RLS
6. Dashboard
7. Create New Map
8. PDF extraction
9. AI structured generation
10. Save nodes and edges
11. React Flow whiteboard
12. Dagre layout
13. Explain
14. Expand
15. Save / reopen map
16. Motion animations
17. Responsive refinement
18. Testing
19. Deployment
20. Documentation

Do not build advanced features before the core flow works.

---

# 49. Definition of Done — MVP

Mindboard MVP is considered functional when a user can:

1. Register.
2. Login.
3. Open Dashboard.
4. Create a new map.
5. Paste text OR upload a text-based PDF.
6. Generate a mind map.
7. See concepts rendered as interactive nodes.
8. Pan and zoom the whiteboard.
9. Move nodes.
10. Select a node.
11. Explain the node.
12. Expand the node.
13. Save the map.
14. Return to Dashboard.
15. Open the saved map again.
16. Only access their own maps.

---

# 50. Agent Rules

When an AI coding agent works on Mindboard:

1. Read this `coldstart.md` before making architectural decisions.
2. Follow the approved PRD.
3. Do not add unapproved features.
4. Preserve the existing stack.
5. Reuse existing components before creating duplicates.
6. Keep client and server responsibilities separated.
7. Keep secrets server-side.
8. Validate external input.
9. Validate AI output.
10. Keep UI minimal.
11. Keep the whiteboard as the visual focus.
12. Prefer simple solutions over unnecessary abstractions.
13. Fix root causes rather than symptoms.
14. Update documentation when an approved architectural decision changes.
15. Ask for approval before changing core architecture, database schema, or MVP scope.

---

# 51. Current Project Status

STEP 1 — PRD: APPROVED

STEP 2 — User Persona & User Flow: APPROVED

STEP 3 — Wireframe: APPROVED

STEP 4 — Database Schema: APPROVED

STEP 5 — Style & Mood: APPROVED

Current status:

> Ready for implementation phase.

No implementation should begin with unapproved scope expansion.
