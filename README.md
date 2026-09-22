# Mindboard

Mindboard is a web application that automatically transforms academic study materials—such as lecture notes and course PDFs—into interactive, explorable knowledge maps. The platform is designed to reduce the time students spend manually outlining and structuring course content, allowing them to focus on comprehension and mastery.

Rather than serving as a general-purpose AI chat interface, Mindboard provides a dedicated learning workspace: material is analyzed by an AI model, converted into a structured concept map, and presented on an interactive whiteboard where concepts can be explored, explained, and expanded incrementally.

---

## Table of Contents

- [Core Features](#core-features)
- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Database and Storage](#database-and-storage)
- [Project Structure](#project-structure)
- [Security](#security)
- [Scripts](#scripts)
- [License](#license)

---

## Core Features

| Feature                                    | Description                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Material Input**                         | Upload a PDF or paste raw text as the source material for map generation.                                                       |
| **AI Mind Map Generation**                 | An AI model analyzes the material and produces a hierarchical structure of main concepts, sub-concepts, and their relationships. |
| **Interactive Whiteboard**                 | The resulting map is rendered as a zoomable, pannable canvas of nodes and edges that can be repositioned freely.                |
| **Explain**                                | Select any concept to receive a grounded explanation derived directly from the source material.                                  |
| **Expand**                                 | Select any concept to generate related sub-concepts, which are added to the map in place.                                       |
| **Save and Reopen**                        | Maps are persisted per user and may be reopened at any time from the personal dashboard.                                        |
| **Authentication**                         | Email/password registration and sign-in, together with Google OAuth single sign-on.                                              |

### Scope

The current version is a minimum viable product. The following are explicitly out of scope: real-time collaboration, multiplayer editing, mobile applications, voice input, social features, gamification, public map sharing, and advanced learning analytics.

---

## Technology Stack

| Layer            | Technology                                                                             |
| ---------------- | -------------------------------------------------------------------------------------- |
| **Framework**    | [Next.js 16](https://nextjs.org) (App Router) with React 19 and TypeScript             |
| **Styling**      | [Tailwind CSS v4](https://tailwindcss.com)                                             |
| **Backend**      | [Supabase](https://supabase.com) (PostgreSQL, Auth, Row-Level Security, Storage)       |
| **Whiteboard**   | [React Flow](https://reactflow.dev) (`@xyflow/react`) with Dagre graph layout          |
| **AI**           | Google Gemini via the [Vercel AI SDK](https://ai-sdk.dev) (`@ai-sdk/google`)           |
| **PDF Parsing**  | [unpdf](https://github.com/unjs/unpdf)                                                 |
| **Validation**   | [Zod](https://zod.dev)                                                                 |
| **Animations**   | [Motion](https://motion.dev)                                                           |
| **Icons**        | [Lucide](https://lucide.dev)                                                           |

---

## Architecture Overview

```
                  ┌─────────────────────────────────────────────┐
  Study Material  │  /maps/new                                  │
  (text / PDF) ───▶  Client upload / paste                      │
                  └──────────────────┬──────────────────────────┘
                                     │ POST /api/generate-map
                                     ▼
                  ┌─────────────────────────────────────────────┐
                  │  Material validation (Zod)                  │
                  │  PDF text extraction (unpdf)                │
                  │  AI structured generation (Gemini)          │
                  │  Persist map / nodes / edges (Supabase)     │
                  └──────────────────┬──────────────────────────┘
                                     │ mapId
                                     ▼
                  ┌─────────────────────────────────────────────┐
                  │  Whiteboard  /maps/[mapId]                  │
                  │  React Flow + Dagre hierarchical layout     │
                  │  Explain  ──▶ POST /api/explain             │
                  │  Expand   ──▶ POST /api/expand              │
                  │  Save     ──▶ POST /api/maps/[id]/save      │
                  └─────────────────────────────────────────────┘
```

Key design decisions:

- **Server-rendered pages, client-side canvas.** Pages are server components reading from Supabase via RLS-scoped queries; the whiteboard canvas is a client component for interactivity.
- **AI output is validated, not trusted.** Structured model output is passed through Zod schemas with hard caps on node and edge counts before it is persisted.
- **Authorization is enforced at two layers.** Row-Level Security in the database, plus explicit ownership checks in every API route.

---

## Getting Started

Prerequisites: Node.js 20+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (see below)
#    Create .env.local from .env.example

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
# Production build and start
npm run build
npm start

# Lint
npm run lint
```

---

## Environment Configuration

Create a `.env.local` file by copying `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

> **Note:** `.env.local` is git-ignored. Never commit keys or secrets.

For Google OAuth, additionally configure the provider in the Supabase dashboard (Authentication → Providers → Google) and register the callback URL `http://localhost:3000/auth/callback` under Authentication → URL Configuration.

---

## Database and Storage

SQL migrations are located in `supabase/migrations/`:

| Migration                       | Description                                                                 |
| ------------------------------- | --------------------------------------------------------------------------- |
| `0001_initial_schema.sql`       | Core tables (`users`, `maps`, `materials`, `nodes`, `edges`), Row-Level Security policies, and a trigger that mirrors new `auth.users` into `public.users`. |
| `0002_storage_materials.sql`    | A private `materials` storage bucket with per-user folder policies.         |

Apply the migrations to your Supabase project with the CLI. The schema, Row-Level Security policies, and indexes are defined entirely in SQL.

---

## Project Structure

```
├── proxy.ts                          # Edge-side session refresh + route guards
├── supabase/migrations/              # Database schema and RLS policies
├── src/
│   ├── app/
│   │   ├── api/                      # generate-map, explain, expand, save
│   │   ├── auth/callback/            # OAuth callback handler
│   │   ├── dashboard/                # Personal map dashboard
│   │   ├── maps/                     # Map creation and whiteboard pages
│   │   └── login/register/           # Authentication pages
│   ├── components/
│   │   ├── auth/                     # Login, registration, Google sign-in
│   │   ├── dashboard/                # Map cards, logout
│   │   ├── maps/                     # Material input / generation flow
│   │   ├── ui/                       # Reusable UI primitives
│   │   └── whiteboard/               # Node components and canvas logic
│   └── lib/
│       ├── ai/                       # Gemini model factory and prompts
│       ├── api/                      # Error handling utilities
│       ├── auth/                     # Session helpers
│       ├── security/                 # Rate limiting, safe redirects
│       ├── supabase/                 # Clients, queries, persistence
│       ├── validation/               # Zod schemas (input and AI output)
│       └── pdf/                      # PDF extraction with limits
```

---

## Security

- **Authentication.** Supabase Auth with email/password and Google OAuth; sessions are refreshed at the edge via `proxy.ts`.
- **Authorization.** Database Row-Level Security restricts every table to the owning user; API routes independently verify map and node ownership before any mutation.
- **Input validation.** All request bodies are validated with Zod. Structured AI output is re-validated, with hard limits on the number of nodes and edges.
- **Rate limiting.** AI endpoints enforce per-user fixed-window rate limits to prevent abuse.
- **Hardened responses.** Internal error details are logged server-side and masked in API responses; client-facing errors are generic.
- **Safe redirects.** OAuth `next` parameters are validated against a whitelist of internal routes to prevent open-redirect vulnerabilities.
- **HTTP hardening.** Content-Security-Policy, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and related headers are applied globally.

---

## Scripts

| Command          | Description                        |
| ---------------- | ---------------------------------- |
| `npm run dev`    | Start the development server.      |
| `npm run build`  | Create a production build.         |
| `npm start`      | Run the production build.          |
| `npm run lint`   | Run ESLint over the codebase.      |

---

## License

All rights reserved. This project is a course-integrated learning application and its source is not published under an open-source license.