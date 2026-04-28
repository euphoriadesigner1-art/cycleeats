# CycleEats — PCOS Nutrition Manager Design Doc

**Date:** 2026-04-28
**Status:** Approved

---

## Overview

CycleEats is a web app that helps PCOS patients make informed food choices by analyzing meals, scanned products, and manual nutrition inputs against PCOS-specific health criteria. It uses Claude AI as the analysis engine and Supabase for auth and persistence.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| AI Engine | Claude API (`claude-sonnet-4-6`) |
| Barcode Data | Open Food Facts API (no key required) |
| Barcode Scanner | `html5-qrcode` |
| Auth + Database | Supabase (PostgreSQL + Supabase Auth) |
| Charts | `recharts` |
| Hosting | Vercel |

---

## Architecture

### Approach: App Router + API Routes

All Claude and Open Food Facts calls are made server-side via Next.js API routes. The API key never reaches the browser. Supabase writes happen client-side after a successful analysis.

### Project Structure

```
/PCOS MANAGER
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx          ← sidebar + nav, protected
│   │   ├── dashboard/page.tsx
│   │   ├── analyze/page.tsx
│   │   ├── history/page.tsx
│   │   ├── profile/page.tsx
│   │   └── education/page.tsx
│   ├── api/
│   │   ├── analyze/route.ts    ← calls Claude API
│   │   └── barcode/route.ts    ← proxies Open Food Facts
│   ├── layout.tsx
│   └── page.tsx                ← landing page (public)
├── components/
│   ├── ui/                     ← Button, Card, Badge, Input
│   ├── analysis/               ← TextInput, BarcodeScanner, ManualForm, ResultCard
│   ├── dashboard/              ← ScoreChart, FlaggedIngredients, StreakCard
│   └── layout/                 ← Sidebar, Navbar, MobileNav
├── lib/
│   ├── supabase/               ← client.ts + server.ts
│   ├── claude.ts               ← buildPrompt(), parseResponse()
│   └── openfoodfacts.ts        ← fetchByBarcode()
├── types/
│   └── index.ts                ← AnalysisResult, MealLog, PCOSProfile
└── .env.local
```

---

## Pages & Routing

| Route | Page | Description |
|---|---|---|
| `/` | Landing | Hero, feature highlights, CTA to sign up |
| `/login` `/signup` | Auth | Supabase email + Google OAuth |
| `/dashboard` | Home | Score trend chart, weekly summary, 3 recent logs, quick-analyze shortcut |
| `/analyze` | Analysis | Tab switcher: Text / Barcode / Manual — all render `ResultCard` |
| `/history` | Meal Logs | Paginated logs, filter by date/score, expandable detail |
| `/profile` | PCOS Profile | Primary concern, secondary concerns, diagnosed toggle, age |
| `/education` | Food Guide | Static PCOS food guide, GI explainer, substitution cheat sheet |

**Auth flow:**
- Unauthenticated users hitting any `(app)` route → redirect to `/login`
- After login → `/dashboard`
- New users after signup → `/profile` to set concern before first analysis

**Navigation:**
- Desktop: fixed left sidebar
- Mobile: bottom tab bar (Dashboard / Analyze / History / Profile)

---

## Data Flow

```
Text input  ──┐
Barcode scan ──┼──→ POST /api/analyze  →  Claude API  →  AnalysisResult JSON  →  Supabase write
Manual form ──┘         ↑
                  (barcode first hits
                   GET /api/barcode →
                   Open Food Facts,
                   then forwards to
                   /api/analyze)
```

### `POST /api/analyze`

```ts
// Request
{
  input_method: "text" | "barcode" | "manual",
  meal_description?: string,
  product_data?: OpenFoodFactsProduct,
  composition?: NutritionComposition,
  user_concern: string
}

// Response: AnalysisResult (see Types section)
```

### `GET /api/barcode?code=<barcode>`

Proxies Open Food Facts. Returns cleaned product object. In-memory cached per session to avoid duplicate fetches.

### Error handling

| Error | Behaviour |
|---|---|
| Barcode not in Open Food Facts | Prompt user to enter nutrition manually |
| Claude returns invalid JSON | Retry once, then show generic error message |
| No camera permission | Hide Barcode tab, show tooltip explaining why |

---

## Database Schema

```sql
-- PCOS Profile (1-to-1 with auth.users)
CREATE TABLE profiles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_concern   text NOT NULL DEFAULT 'general',
  secondary_concerns text[],
  diagnosed         boolean DEFAULT false,
  age               int,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Meal Logs
CREATE TABLE meal_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  input_method     text NOT NULL,
  meal_description text,
  product_name     text,
  raw_composition  jsonb,
  analysis_result  jsonb NOT NULL,
  pcos_score       int NOT NULL,
  created_at       timestamptz DEFAULT now()
);

-- Flagged Ingredients (for trend tracking)
CREATE TABLE flagged_ingredients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_log_id uuid REFERENCES meal_logs(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredient  text NOT NULL,
  risk_type   text,
  severity    text
);
```

**RLS:** Enabled on all tables. Policy: `auth.uid() = user_id`.

**Key dashboard queries:**
- Weekly avg score: `SELECT AVG(pcos_score) FROM meal_logs WHERE user_id = ? AND created_at > now() - interval '7 days'`
- Most flagged: `SELECT ingredient, COUNT(*) FROM flagged_ingredients WHERE user_id = ? GROUP BY ingredient ORDER BY count DESC LIMIT 5`

---

## Claude Prompt Design

**Model:** `claude-sonnet-4-6` | **Max tokens:** 1024 | **No streaming**

**System prompt:**
```
You are a PCOS nutrition specialist AI. Analyze the food input provided
and return a JSON object only — no extra text, no markdown, no explanation.

Evaluate based on:
1. Insulin Impact — glycemic index, refined carbs, sugar content
2. Androgen Risk — excess dairy, processed sugars, soy
3. Inflammation Level — seed oils, trans fats, additives, preservatives
4. Fiber Rating — soluble/insoluble fiber that buffers insulin spikes
5. PCOS Score (1–10) where 10 = maximally PCOS-friendly
6. Flagged ingredients with one-line reasons
7. Safe ingredients
8. Specific substitution suggestions
9. A plain-English summary (2–3 sentences, no jargon)

The user's primary concern is: {concern}
Adjust severity weighting accordingly:
- insulin_resistance → weight insulin_impact and pcos_score heavily
- acne → weight androgen_risk heavily
- fertility → flag endocrine disruptors explicitly
- weight → flag caloric density and satiety factors
```

**Response type:**
```ts
interface AnalysisResult {
  pcos_score: number;                    // 1–10
  insulin_impact: "Low" | "Moderate" | "High";
  androgen_risk: "Low" | "Moderate" | "High";
  inflammation_level: "Low" | "Moderate" | "High";
  fiber_rating: "Poor" | "Fair" | "Good" | "Excellent";
  flagged_ingredients: Array<{
    name: string;
    reason: string;
    risk_type: string;
  }>;
  safe_ingredients: string[];
  substitutions: string[];
  summary: string;
}
```

---

## UI/UX Design System

**Palette (warm & lifestyle):**

| Token | Value | Use |
|---|---|---|
| Background | `#FDF8F4` | Page background |
| Surface | `#FFFFFF` | Cards |
| Primary | `#7C3AED` | Buttons, active states |
| Primary soft | `#EDE9FE` | Tinted backgrounds |
| Earthy accent | `#C2956B` | Icons, decorative |
| Text primary | `#1C1917` | Body text |
| Text muted | `#78716C` | Captions, labels |
| Score green | `#16A34A` | Score 7–10 |
| Score amber | `#D97706` | Score 4–6 |
| Score red | `#DC2626` | Score 1–3 |

**Typography:** `Inter` (UI) + `Lora` (headings)

**Key components:**

- **`ResultCard`** — score ring + color-coded impact badges + flagged/safe ingredient accordions + substitution chips. Shared across all 3 input methods.
- **`ScoreRing`** — animated SVG progress ring, color-shifts based on score value
- **`BarcodeScanner`** — fullscreen camera overlay with scan line animation, manual entry fallback
- **`TrendChart`** — 7-day line chart of daily avg PCOS score (`recharts`)
- **`ConcernBadge`** — pill showing user's primary concern on dashboard

**Responsive:** single-column below 768px, bottom tab bar on mobile, barcode scanner full-screen on mobile.

---

## Environment Variables

```bash
# .env.local
ANTHROPIC_API_KEY=       # Get from console.anthropic.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
