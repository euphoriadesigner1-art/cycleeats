# CycleEats Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build CycleEats, a full-stack PCOS Nutrition Manager web app that analyzes meals via text, barcode scan, or manual input using Claude AI, with Supabase auth and meal history.

**Architecture:** Next.js 14 App Router with route groups `(auth)` and `(app)`. All Claude and Open Food Facts calls are proxied through Next.js API routes so secrets never reach the browser. Supabase handles auth and persistence with RLS on all tables.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase, Claude API (`claude-sonnet-4-6`), `@anthropic-ai/sdk`, `@supabase/ssr`, `html5-qrcode`, `recharts`, `lucide-react`

---

## Pre-Flight: Get Your API Keys

Before starting, you need:

1. **Anthropic API Key** — go to [console.anthropic.com](https://console.anthropic.com), sign up, go to "API Keys", create a key. Copy it.
2. **Supabase project** — covered in Task 6 below.

---

## Task 1: Scaffold the Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `.env.local`, `.gitignore`

**Step 1: Create the Next.js app**

Run inside `/Users/davidkoffi/PCOS MANAGER`:
```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir no --import-alias "@/*" --no-git
```
When prompted, answer: Yes to all defaults.

**Step 2: Install additional dependencies**

```bash
npm install @anthropic-ai/sdk @supabase/ssr @supabase/supabase-js html5-qrcode recharts lucide-react clsx tailwind-merge
npm install -D @types/node
```

**Step 3: Create `.env.local`**

```bash
# .env.local
ANTHROPIC_API_KEY=your_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Step 4: Update `next.config.ts`**

Replace contents with:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: "world.openfoodfacts.org" }],
  },
};

export default nextConfig;
```

**Step 5: Update `tailwind.config.ts`**

Replace contents with:
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FDF8F4",
        surface: "#FFFFFF",
        primary: {
          DEFAULT: "#7C3AED",
          soft: "#EDE9FE",
        },
        earthy: "#C2956B",
        score: {
          green: "#16A34A",
          amber: "#D97706",
          red: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        heading: ["Lora", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

**Step 6: Update `app/globals.css`**

Replace contents with:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #FDF8F4;
}

body {
  background-color: var(--background);
  color: #1C1917;
}
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind and dependencies"
```

---

## Task 2: Define Types

**Files:**
- Create: `types/index.ts`

**Step 1: Create the types file**

```ts
// types/index.ts

export interface AnalysisResult {
  pcos_score: number;
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

export interface NutritionComposition {
  carbs_g?: number;
  sugar_g?: number;
  fiber_g?: number;
  fat_g?: number;
  protein_g?: number;
  ingredients_text?: string;
}

export interface OpenFoodFactsProduct {
  product_name: string;
  brands?: string;
  ingredients_text?: string;
  nutriments?: {
    carbohydrates_100g?: number;
    sugars_100g?: number;
    fiber_100g?: number;
    fat_100g?: number;
    proteins_100g?: number;
  };
  additives_tags?: string[];
}

export interface AnalyzeRequest {
  input_method: "text" | "barcode" | "manual";
  meal_description?: string;
  product_data?: OpenFoodFactsProduct;
  composition?: NutritionComposition;
  user_concern: string;
}

export type PrimaryConcern =
  | "general"
  | "insulin_resistance"
  | "acne"
  | "weight"
  | "fertility";

export interface PCOSProfile {
  id: string;
  user_id: string;
  primary_concern: PrimaryConcern;
  secondary_concerns: string[];
  diagnosed: boolean;
  age: number | null;
  created_at: string;
}

export interface MealLog {
  id: string;
  user_id: string;
  input_method: "text" | "barcode" | "manual";
  meal_description: string | null;
  product_name: string | null;
  raw_composition: NutritionComposition | null;
  analysis_result: AnalysisResult;
  pcos_score: number;
  created_at: string;
}
```

**Step 2: Verify TypeScript is happy**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Supabase Utility Layer

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `middleware.ts`

**Step 1: Create browser Supabase client**

```ts
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 2: Create server Supabase client**

```ts
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
```

**Step 3: Create auth middleware**

```ts
// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const protectedPaths = ["/dashboard", "/analyze", "/history", "/profile", "/education"];
  const isProtected = protectedPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

**Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 5: Commit**

```bash
git add lib/supabase/client.ts lib/supabase/server.ts middleware.ts
git commit -m "feat: add Supabase client utilities and auth middleware"
```

---

## Task 4: Claude Utility (`lib/claude.ts`)

**Files:**
- Create: `lib/claude.ts`

**Step 1: Create the file**

```ts
// lib/claude.ts
import Anthropic from "@anthropic-ai/sdk";
import type { AnalyzeRequest, AnalysisResult } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a PCOS nutrition specialist AI. Analyze the food input provided and return a JSON object only — no extra text, no markdown, no explanation.

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

Return exactly this JSON shape:
{
  "pcos_score": number,
  "insulin_impact": "Low" | "Moderate" | "High",
  "androgen_risk": "Low" | "Moderate" | "High",
  "inflammation_level": "Low" | "Moderate" | "High",
  "fiber_rating": "Poor" | "Fair" | "Good" | "Excellent",
  "flagged_ingredients": [{ "name": string, "reason": string, "risk_type": string }],
  "safe_ingredients": string[],
  "substitutions": string[],
  "summary": string
}`;

export function buildUserMessage(req: AnalyzeRequest): string {
  const concernNote = `User's primary PCOS concern: ${req.user_concern}. Adjust severity weighting accordingly (insulin_resistance → weight insulin_impact heavily; acne → weight androgen_risk; fertility → flag endocrine disruptors; weight → flag caloric density).`;

  if (req.input_method === "text") {
    return `${concernNote}\n\nMeal description: ${req.meal_description}`;
  }

  if (req.input_method === "barcode" && req.product_data) {
    const p = req.product_data;
    const n = p.nutriments ?? {};
    return `${concernNote}\n\nProduct: ${p.product_name}${p.brands ? ` (${p.brands})` : ""}
Ingredients: ${p.ingredients_text ?? "not available"}
Per 100g: carbs ${n.carbohydrates_100g ?? "?"}g, sugar ${n.sugars_100g ?? "?"}g, fiber ${n.fiber_100g ?? "?"}g, fat ${n.fat_100g ?? "?"}g, protein ${n.proteins_100g ?? "?"}g
Additives: ${p.additives_tags?.join(", ") ?? "none listed"}`;
  }

  if (req.input_method === "manual" && req.composition) {
    const c = req.composition;
    return `${concernNote}\n\nManual nutrition entry:
Carbs: ${c.carbs_g ?? "?"}g, Sugar: ${c.sugar_g ?? "?"}g, Fiber: ${c.fiber_g ?? "?"}g, Fat: ${c.fat_g ?? "?"}g, Protein: ${c.protein_g ?? "?"}g
Ingredients: ${c.ingredients_text ?? "not provided"}`;
  }

  throw new Error("Invalid analyze request");
}

export function parseAnalysisResponse(text: string): AnalysisResult {
  // Strip any accidental markdown code fences
  const cleaned = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(cleaned) as AnalysisResult;
}

export async function analyzeWithClaude(req: AnalyzeRequest): Promise<AnalysisResult> {
  const userMessage = buildUserMessage(req);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    return parseAnalysisResponse(text);
  } catch {
    // Retry once
    const retry = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: userMessage },
        { role: "assistant", content: text },
        { role: "user", content: "Your response was not valid JSON. Please return only the JSON object with no extra text." },
      ],
    });
    const retryText = retry.content[0].type === "text" ? retry.content[0].text : "";
    return parseAnalysisResponse(retryText);
  }
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add lib/claude.ts
git commit -m "feat: add Claude analysis utility with retry logic"
```

---

## Task 5: Open Food Facts Utility (`lib/openfoodfacts.ts`)

**Files:**
- Create: `lib/openfoodfacts.ts`

**Step 1: Create the file**

```ts
// lib/openfoodfacts.ts
import type { OpenFoodFactsProduct } from "@/types";

export async function fetchByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) return null;

  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;

  const p = data.product;
  return {
    product_name: p.product_name ?? "Unknown Product",
    brands: p.brands ?? undefined,
    ingredients_text: p.ingredients_text ?? undefined,
    nutriments: {
      carbohydrates_100g: p.nutriments?.carbohydrates_100g,
      sugars_100g: p.nutriments?.sugars_100g,
      fiber_100g: p.nutriments?.fiber_100g,
      fat_100g: p.nutriments?.fat_100g,
      proteins_100g: p.nutriments?.proteins_100g,
    },
    additives_tags: p.additives_tags ?? [],
  };
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add lib/openfoodfacts.ts
git commit -m "feat: add Open Food Facts barcode lookup utility"
```

---

## Task 6: Supabase Project Setup

**This task is manual — follow each step carefully.**

**Step 1: Create Supabase project**

1. Go to [supabase.com](https://supabase.com) and sign in / create an account
2. Click "New Project"
3. Name it `cycleeats`, choose a region close to you, set a strong database password
4. Wait ~2 minutes for the project to provision

**Step 2: Get your keys**

In the Supabase dashboard → Project Settings → API:
- Copy `Project URL` → paste into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`
- Copy `anon public` key → paste as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy `service_role` key → paste as `SUPABASE_SERVICE_ROLE_KEY`

**Step 3: Run database migrations**

In Supabase dashboard → SQL Editor → New query. Paste and run:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles table
CREATE TABLE profiles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_concern   text NOT NULL DEFAULT 'general',
  secondary_concerns text[] DEFAULT '{}',
  diagnosed         boolean DEFAULT false,
  age               int,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Meal logs table
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

-- Flagged ingredients table
CREATE TABLE flagged_ingredients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_log_id uuid REFERENCES meal_logs(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredient  text NOT NULL,
  risk_type   text,
  severity    text
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flagged_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own profile"
  ON profiles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own meal logs"
  ON meal_logs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own flagged ingredients"
  ON flagged_ingredients FOR ALL USING (auth.uid() = user_id);
```

**Step 4: Enable Google OAuth (optional)**

In Supabase dashboard → Authentication → Providers → Google → toggle on. Follow the instructions to create a Google OAuth app if you want Google login.

**Step 5: Verify the server connects**

```bash
npx tsx -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
s.from('profiles').select('count').then(r => console.log('Connected:', r));
"
```
Expected: `Connected: { data: [...], error: null }`

---

## Task 7: API Routes

**Files:**
- Create: `app/api/barcode/route.ts`
- Create: `app/api/analyze/route.ts`

**Step 1: Create barcode proxy route**

```ts
// app/api/barcode/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchByBarcode } from "@/lib/openfoodfacts";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing barcode" }, { status: 400 });
  }

  const product = await fetchByBarcode(code);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}
```

**Step 2: Create analyze route**

```ts
// app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { analyzeWithClaude } from "@/lib/claude";
import type { AnalyzeRequest } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();

    if (!body.input_method || !body.user_concern) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await analyzeWithClaude(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
```

**Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 4: Test the barcode route manually (after dev server starts)**

Start the server: `npm run dev`

In a new terminal:
```bash
curl "http://localhost:3000/api/barcode?code=3017620422003"
```
Expected: JSON with Nutella product data (or similar product).

**Step 5: Commit**

```bash
git add app/api/
git commit -m "feat: add /api/analyze and /api/barcode routes"
```

---

## Task 8: UI Primitives

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Card.tsx`
- Create: `components/ui/Badge.tsx`
- Create: `components/ui/Input.tsx`
- Create: `lib/utils.ts`

**Step 1: Create cn utility**

```ts
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 2: Create Button**

```tsx
// components/ui/Button.tsx
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
          {
            "bg-primary text-white hover:bg-primary/90": variant === "primary",
            "bg-primary-soft text-primary hover:bg-primary-soft/80": variant === "secondary",
            "bg-transparent text-stone-600 hover:bg-stone-100": variant === "ghost",
            "px-3 py-1.5 text-sm": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-6 py-3 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
export { Button };
```

**Step 3: Create Card**

```tsx
// components/ui/Card.tsx
import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-white rounded-2xl shadow-sm border border-stone-100 p-6", className)}
      {...props}
    />
  );
}
```

**Step 4: Create Badge**

```tsx
// components/ui/Badge.tsx
import { cn } from "@/lib/utils";

interface BadgeProps {
  label: string;
  level: "Low" | "Moderate" | "High" | "Poor" | "Fair" | "Good" | "Excellent";
  className?: string;
}

const levelColors: Record<string, string> = {
  Low: "bg-green-100 text-green-700",
  Good: "bg-green-100 text-green-700",
  Excellent: "bg-green-100 text-green-700",
  Moderate: "bg-amber-100 text-amber-700",
  Fair: "bg-amber-100 text-amber-700",
  High: "bg-red-100 text-red-700",
  Poor: "bg-red-100 text-red-700",
};

export function Badge({ label, level, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
        levelColors[level],
        className
      )}
    >
      {label}: <strong>{level}</strong>
    </span>
  );
}
```

**Step 5: Create Input**

```tsx
// components/ui/Input.tsx
import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
export { Input };
```

**Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

**Step 7: Commit**

```bash
git add components/ui/ lib/utils.ts
git commit -m "feat: add UI primitive components (Button, Card, Badge, Input)"
```

---

## Task 9: Layout Components

**Files:**
- Create: `components/layout/Sidebar.tsx`
- Create: `components/layout/MobileNav.tsx`

**Step 1: Create Sidebar**

```tsx
// components/layout/Sidebar.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ScanLine, History, User, BookOpen, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analyze", label: "Analyze", icon: ScanLine },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/education", label: "Food Guide", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-white border-r border-stone-100 px-4 py-6 fixed left-0 top-0">
      <div className="flex items-center gap-2 mb-10 px-2">
        <Leaf className="text-primary" size={22} />
        <span className="font-heading font-semibold text-lg text-stone-800">CycleEats</span>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-primary-soft text-primary"
                : "text-stone-600 hover:bg-stone-50"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

**Step 2: Create MobileNav**

```tsx
// components/layout/MobileNav.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ScanLine, History, User } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/analyze", label: "Analyze", icon: ScanLine },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "Profile", icon: User },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 flex z-50">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
            pathname.startsWith(href) ? "text-primary" : "text-stone-400"
          )}
        >
          <Icon size={20} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
```

**Step 3: Commit**

```bash
git add components/layout/
git commit -m "feat: add Sidebar and MobileNav layout components"
```

---

## Task 10: Root Layout and App Layout

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/(app)/layout.tsx`

**Step 1: Update root layout**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CycleEats — PCOS Nutrition Manager",
  description: "Analyze your meals for PCOS-friendly nutrition",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**Step 2: Create protected app layout**

```tsx
// app/(app)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:ml-60 pb-20 md:pb-0 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add app/layout.tsx app/\(app\)/layout.tsx
git commit -m "feat: add root and protected app layouts"
```

---

## Task 11: Auth Pages

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/signup/page.tsx`

**Step 1: Create login page**

```tsx
// app/(auth)/login/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Leaf } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Leaf className="text-primary" size={28} />
          <span className="font-heading text-2xl font-semibold text-stone-800">CycleEats</span>
        </div>
        <Card>
          <h1 className="font-heading text-xl font-semibold text-stone-800 mb-6">Welcome back</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-stone-500 text-center">
            No account?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
```

**Step 2: Create signup page**

```tsx
// app/(auth)/signup/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Leaf } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/profile");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Leaf className="text-primary" size={28} />
          <span className="font-heading text-2xl font-semibold text-stone-800">CycleEats</span>
        </div>
        <Card>
          <h1 className="font-heading text-xl font-semibold text-stone-800 mb-2">Create account</h1>
          <p className="text-sm text-stone-500 mb-6">Start making PCOS-informed food choices</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-stone-500 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
```

**Step 3: Verify build**

```bash
npm run build
```
Expected: no TypeScript errors, pages compile.

**Step 4: Commit**

```bash
git add app/\(auth\)/
git commit -m "feat: add login and signup auth pages"
```

---

## Task 12: ScoreRing Component

**Files:**
- Create: `components/analysis/ScoreRing.tsx`

**Step 1: Create the component**

```tsx
// components/analysis/ScoreRing.tsx
"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: number;
}

function scoreColor(score: number) {
  if (score >= 7) return "#16A34A";
  if (score >= 4) return "#D97706";
  return "#DC2626";
}

function scoreLabel(score: number) {
  if (score >= 7) return "PCOS Friendly";
  if (score >= 4) return "Moderate";
  return "High Risk";
}

export function ScoreRing({ score, size = 120 }: ScoreRingProps) {
  const [animated, setAnimated] = useState(0);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animated / 10) * circumference;

  useEffect(() => {
    const timeout = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(timeout);
  }, [score]);

  const color = scoreColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F5F0EB"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center" style={{ marginTop: size / 2 - 20 }}>
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-stone-500">/10</span>
      </div>
      <span className="text-xs font-medium" style={{ color }}>{scoreLabel(score)}</span>
    </div>
  );
}
```

**Note:** The ScoreRing uses `position: absolute` for the number overlay inside an `relative` container on the parent. Wrap it in a `relative` div when using it.

**Step 2: Commit**

```bash
git add components/analysis/ScoreRing.tsx
git commit -m "feat: add animated ScoreRing component"
```

---

## Task 13: ResultCard Component

**Files:**
- Create: `components/analysis/ResultCard.tsx`

**Step 1: Create the component**

```tsx
// components/analysis/ResultCard.tsx
"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "./ScoreRing";
import type { AnalysisResult } from "@/types";

interface ResultCardProps {
  result: AnalysisResult;
  mealLabel?: string;
}

export function ResultCard({ result, mealLabel }: ResultCardProps) {
  const [flaggedOpen, setFlaggedOpen] = useState(true);
  const [safeOpen, setSafeOpen] = useState(false);

  return (
    <Card className="flex flex-col gap-6">
      {mealLabel && (
        <p className="text-sm text-stone-500 font-medium truncate">{mealLabel}</p>
      )}

      {/* Score + Badges */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative flex items-center justify-center">
          <ScoreRing score={result.pcos_score} size={120} />
          <div className="absolute flex flex-col items-center pointer-events-none">
            <span className="text-3xl font-bold" style={{
              color: result.pcos_score >= 7 ? "#16A34A" : result.pcos_score >= 4 ? "#D97706" : "#DC2626"
            }}>
              {result.pcos_score}
            </span>
            <span className="text-xs text-stone-400">/10</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge label="Insulin" level={result.insulin_impact} />
          <Badge label="Androgen" level={result.androgen_risk} />
          <Badge label="Inflammation" level={result.inflammation_level} />
          <Badge label="Fiber" level={result.fiber_rating} />
        </div>
      </div>

      {/* Summary */}
      <p className="text-stone-600 text-sm leading-relaxed bg-primary-soft/50 rounded-xl p-4">
        {result.summary}
      </p>

      {/* Flagged Ingredients */}
      {result.flagged_ingredients.length > 0 && (
        <div>
          <button
            onClick={() => setFlaggedOpen((o) => !o)}
            className="flex items-center justify-between w-full text-sm font-medium text-stone-700 mb-2"
          >
            <span className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500" />
              Flagged ingredients ({result.flagged_ingredients.length})
            </span>
            {flaggedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {flaggedOpen && (
            <ul className="flex flex-col gap-2">
              {result.flagged_ingredients.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm bg-red-50 rounded-lg p-3">
                  <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-stone-700">{item.name}</span>
                    <span className="text-stone-500"> — {item.reason}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Safe Ingredients */}
      {result.safe_ingredients.length > 0 && (
        <div>
          <button
            onClick={() => setSafeOpen((o) => !o)}
            className="flex items-center justify-between w-full text-sm font-medium text-stone-700 mb-2"
          >
            <span className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              Safe ingredients ({result.safe_ingredients.length})
            </span>
            {safeOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {safeOpen && (
            <div className="flex flex-wrap gap-2">
              {result.safe_ingredients.map((item, i) => (
                <span key={i} className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full">
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Substitutions */}
      {result.substitutions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-stone-700 mb-2 flex items-center gap-2">
            <ArrowRight size={16} className="text-primary" />
            Suggested substitutions
          </h4>
          <ul className="flex flex-col gap-1.5">
            {result.substitutions.map((sub, i) => (
              <li key={i} className="text-sm text-stone-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {sub}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add components/analysis/ResultCard.tsx
git commit -m "feat: add ResultCard analysis display component"
```

---

## Task 14: Analysis Input Components

**Files:**
- Create: `components/analysis/TextInput.tsx`
- Create: `components/analysis/ManualForm.tsx`
- Create: `components/analysis/BarcodeScanner.tsx`

**Step 1: Create TextInput**

```tsx
// components/analysis/TextInput.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface TextInputProps {
  onSubmit: (description: string) => void;
  loading: boolean;
}

export function TextInput({ onSubmit, loading }: TextInputProps) {
  const [value, setValue] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <textarea
        className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-32"
        placeholder="Describe your meal… e.g. 'jollof rice with fried chicken and a Coke'"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        onClick={() => value.trim() && onSubmit(value.trim())}
        disabled={loading || !value.trim()}
        size="lg"
      >
        {loading ? "Analyzing…" : "Analyze Meal"}
      </Button>
    </div>
  );
}
```

**Step 2: Create ManualForm**

```tsx
// components/analysis/ManualForm.tsx
"use client";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { NutritionComposition } from "@/types";

interface ManualFormProps {
  onSubmit: (composition: NutritionComposition) => void;
  loading: boolean;
}

export function ManualForm({ onSubmit, loading }: ManualFormProps) {
  const [form, setForm] = useState<NutritionComposition>({});

  function set(key: keyof NutritionComposition, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: key === "ingredients_text" ? value : value === "" ? undefined : Number(value),
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {(["carbs_g", "sugar_g", "fiber_g", "fat_g", "protein_g"] as const).map((field) => (
          <div key={field}>
            <label className="text-xs text-stone-500 mb-1 block capitalize">
              {field.replace("_g", "")} (g)
            </label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              onChange={(e) => set(field, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div>
        <label className="text-xs text-stone-500 mb-1 block">Ingredients (optional)</label>
        <textarea
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-24"
          placeholder="Paste ingredients list from the label…"
          onChange={(e) => set("ingredients_text", e.target.value)}
        />
      </div>
      <Button onClick={() => onSubmit(form)} disabled={loading} size="lg">
        {loading ? "Analyzing…" : "Analyze Composition"}
      </Button>
    </div>
  );
}
```

**Step 3: Create BarcodeScanner**

```tsx
// components/analysis/BarcodeScanner.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Loader } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  loading: boolean;
}

export function BarcodeScanner({ onDetected, loading }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const scannerRef = useRef<unknown>(null);

  async function startScanner() {
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          stopScanner();
          onDetected(decodedText);
        },
        undefined
      );
      setScanning(true);
    } catch {
      setPermissionDenied(true);
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      const s = scannerRef.current as { stop: () => Promise<void> };
      await s.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  }

  useEffect(() => () => { stopScanner(); }, []);

  if (permissionDenied) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CameraOff size={40} className="text-stone-400" />
        <p className="text-sm text-stone-500">Camera permission denied. Enter the barcode manually below.</p>
        <div className="flex gap-2 w-full max-w-xs">
          <input
            type="text"
            placeholder="Barcode number"
            className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
          />
          <Button onClick={() => manualCode && onDetected(manualCode)} disabled={!manualCode || loading} size="sm">
            Go
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div id="qr-reader" className={scanning ? "rounded-xl overflow-hidden" : "hidden"} />
      {loading && (
        <div className="flex items-center gap-2 justify-center py-4 text-sm text-stone-500">
          <Loader size={16} className="animate-spin" />
          Looking up product…
        </div>
      )}
      {!scanning && !loading && (
        <button
          onClick={startScanner}
          className="flex flex-col items-center gap-3 py-12 border-2 border-dashed border-stone-200 rounded-xl hover:border-primary hover:bg-primary-soft/30 transition-colors"
        >
          <Camera size={36} className="text-stone-400" />
          <span className="text-sm text-stone-500">Tap to scan barcode</span>
        </button>
      )}
      {scanning && (
        <Button variant="secondary" onClick={stopScanner} size="sm" className="self-center">
          Cancel
        </Button>
      )}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add components/analysis/
git commit -m "feat: add TextInput, ManualForm, and BarcodeScanner analysis components"
```

---

## Task 15: Analyze Page

**Files:**
- Create: `app/(app)/analyze/page.tsx`

**Step 1: Create the page**

```tsx
// app/(app)/analyze/page.tsx
"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TextInput } from "@/components/analysis/TextInput";
import { ManualForm } from "@/components/analysis/ManualForm";
import { BarcodeScanner } from "@/components/analysis/BarcodeScanner";
import { ResultCard } from "@/components/analysis/ResultCard";
import { cn } from "@/lib/utils";
import type { AnalysisResult, NutritionComposition, OpenFoodFactsProduct } from "@/types";

type Tab = "text" | "barcode" | "manual";

export default function AnalyzePage() {
  const [tab, setTab] = useState<Tab>("text");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [mealLabel, setMealLabel] = useState("");
  const [error, setError] = useState("");

  async function getUserConcern(): Promise<string> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "general";
    const { data } = await supabase
      .from("profiles")
      .select("primary_concern")
      .eq("user_id", user.id)
      .single();
    return data?.primary_concern ?? "general";
  }

  async function runAnalysis(body: object, label: string) {
    setLoading(true);
    setError("");
    setResult(null);
    setMealLabel(label);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data: AnalysisResult = await res.json();
      setResult(data);
      await saveToDB(data, body, label);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function saveToDB(data: AnalysisResult, body: object, label: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const b = body as Record<string, unknown>;
    const { data: log } = await supabase.from("meal_logs").insert({
      user_id: user.id,
      input_method: b.input_method,
      meal_description: b.meal_description ?? label,
      product_name: (b.product_data as OpenFoodFactsProduct)?.product_name ?? null,
      raw_composition: b.composition ?? null,
      analysis_result: data,
      pcos_score: data.pcos_score,
    }).select().single();
    if (log && data.flagged_ingredients.length > 0) {
      await supabase.from("flagged_ingredients").insert(
        data.flagged_ingredients.map((fi) => ({
          meal_log_id: log.id,
          user_id: user.id,
          ingredient: fi.name,
          risk_type: fi.risk_type,
          severity: fi.risk_type === "High" ? "high" : "moderate",
        }))
      );
    }
  }

  async function handleText(description: string) {
    const concern = await getUserConcern();
    await runAnalysis({ input_method: "text", meal_description: description, user_concern: concern }, description);
  }

  async function handleBarcode(code: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/barcode?code=${code}`);
      if (!res.ok) {
        setError("Product not found. Try entering nutrition manually.");
        setLoading(false);
        return;
      }
      const product: OpenFoodFactsProduct = await res.json();
      const concern = await getUserConcern();
      await runAnalysis({ input_method: "barcode", product_data: product, user_concern: concern }, product.product_name);
    } catch {
      setError("Barcode lookup failed.");
      setLoading(false);
    }
  }

  async function handleManual(composition: NutritionComposition) {
    const concern = await getUserConcern();
    await runAnalysis({ input_method: "manual", composition, user_concern: concern }, "Manual entry");
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "text", label: "Describe Meal" },
    { id: "barcode", label: "Scan Barcode" },
    { id: "manual", label: "Manual Entry" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-stone-800">Analyze a Meal</h1>
        <p className="text-stone-500 text-sm mt-1">Choose how you'd like to enter your food</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setResult(null); setError(""); }}
            className={cn(
              "flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
              tab === id ? "bg-white text-primary shadow-sm" : "text-stone-500 hover:text-stone-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        {tab === "text" && <TextInput onSubmit={handleText} loading={loading} />}
        {tab === "barcode" && <BarcodeScanner onDetected={handleBarcode} loading={loading} />}
        {tab === "manual" && <ManualForm onSubmit={handleManual} loading={loading} />}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {result && <ResultCard result={result} mealLabel={mealLabel} />}
    </div>
  );
}
```

**Step 2: Test in browser**

```bash
npm run dev
```

Open [http://localhost:3000/analyze](http://localhost:3000/analyze). Log in first, then test text analysis with: "oatmeal with berries and almond milk". Expected: ResultCard renders with a score, badges, and suggestions.

**Step 3: Commit**

```bash
git add app/\(app\)/analyze/
git commit -m "feat: add analyze page with text, barcode, and manual input"
```

---

## Task 16: Dashboard Components and Page

**Files:**
- Create: `components/dashboard/TrendChart.tsx`
- Create: `app/(app)/dashboard/page.tsx`

**Step 1: Create TrendChart**

```tsx
// components/dashboard/TrendChart.tsx
"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface TrendChartProps {
  data: Array<{ date: string; avg_score: number }>;
}

export function TrendChart({ data }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-stone-400">
        No data yet — analyze some meals to see your trend
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#78716C" }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "#78716C" }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, fontSize: 12 }}
          formatter={(v: number) => [`${v.toFixed(1)}`, "PCOS Score"]}
        />
        <ReferenceLine y={7} stroke="#16A34A" strokeDasharray="4 4" strokeOpacity={0.5} />
        <ReferenceLine y={4} stroke="#D97706" strokeDasharray="4 4" strokeOpacity={0.5} />
        <Line
          type="monotone"
          dataKey="avg_score"
          stroke="#7C3AED"
          strokeWidth={2}
          dot={{ r: 4, fill: "#7C3AED" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Step 2: Create Dashboard page**

```tsx
// app/(app)/dashboard/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { TrendChart } from "@/components/dashboard/TrendChart";
import Link from "next/link";
import { ScanLine, TrendingUp, AlertCircle } from "lucide-react";
import type { MealLog } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [logsRes, profileRes, flaggedRes] = await Promise.all([
    supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("profiles")
      .select("primary_concern")
      .eq("user_id", user!.id)
      .single(),
    supabase
      .from("flagged_ingredients")
      .select("ingredient")
      .eq("user_id", user!.id),
  ]);

  const logs: MealLog[] = logsRes.data ?? [];
  const concern = profileRes.data?.primary_concern ?? "general";

  // Weekly avg score
  const weekLogs = logs.filter(
    (l) => new Date(l.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  const weekAvg = weekLogs.length
    ? (weekLogs.reduce((s, l) => s + l.pcos_score, 0) / weekLogs.length).toFixed(1)
    : null;

  // Trend data (last 7 days grouped by date)
  const trendMap: Record<string, number[]> = {};
  logs.forEach((l) => {
    const date = new Date(l.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!trendMap[date]) trendMap[date] = [];
    trendMap[date].push(l.pcos_score);
  });
  const trendData = Object.entries(trendMap)
    .slice(-7)
    .map(([date, scores]) => ({
      date,
      avg_score: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));

  // Most flagged ingredients
  const ingredientCount: Record<string, number> = {};
  (flaggedRes.data ?? []).forEach(({ ingredient }) => {
    ingredientCount[ingredient] = (ingredientCount[ingredient] ?? 0) + 1;
  });
  const topFlagged = Object.entries(ingredientCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-stone-800">Dashboard</h1>
          {concern !== "general" && (
            <span className="text-xs bg-primary-soft text-primary px-2.5 py-1 rounded-full font-medium">
              Focus: {concern.replace("_", " ")}
            </span>
          )}
        </div>
        <Link
          href="/analyze"
          className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
        >
          <ScanLine size={16} />
          Analyze
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs text-stone-500 mb-1">Weekly Avg Score</p>
          <p className="text-3xl font-bold text-primary">{weekAvg ?? "—"}</p>
          <p className="text-xs text-stone-400">{weekLogs.length} meals this week</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-stone-500 mb-1">Total Logs</p>
          <p className="text-3xl font-bold text-stone-700">{logs.length}</p>
          <p className="text-xs text-stone-400">all time</p>
        </Card>
      </div>

      {/* Trend chart */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-stone-700">PCOS Score Trend</h2>
        </div>
        <TrendChart data={trendData} />
      </Card>

      {/* Most flagged */}
      {topFlagged.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="text-red-400" />
            <h2 className="text-sm font-semibold text-stone-700">Most Flagged Ingredients</h2>
          </div>
          <ul className="flex flex-col gap-2">
            {topFlagged.map(([ingredient, count]) => (
              <li key={ingredient} className="flex items-center justify-between text-sm">
                <span className="text-stone-700">{ingredient}</span>
                <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{count}×</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Recent logs */}
      {logs.slice(0, 3).length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-stone-700 mb-3">Recent Analyses</h2>
          <ul className="flex flex-col gap-3">
            {logs.slice(0, 3).map((log) => (
              <li key={log.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-700 truncate max-w-[200px]">
                    {log.product_name ?? log.meal_description ?? "Manual entry"}
                  </p>
                  <p className="text-xs text-stone-400">
                    {new Date(log.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className="text-sm font-bold"
                  style={{
                    color: log.pcos_score >= 7 ? "#16A34A" : log.pcos_score >= 4 ? "#D97706" : "#DC2626",
                  }}
                >
                  {log.pcos_score}/10
                </span>
              </li>
            ))}
          </ul>
          <Link href="/history" className="text-xs text-primary hover:underline mt-3 block">
            View all →
          </Link>
        </Card>
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add components/dashboard/ app/\(app\)/dashboard/
git commit -m "feat: add dashboard page with trend chart and stats"
```

---

## Task 17: History Page

**Files:**
- Create: `app/(app)/history/page.tsx`

**Step 1: Create the page**

```tsx
// app/(app)/history/page.tsx
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { ResultCard } from "@/components/analysis/ResultCard";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { MealLog } from "@/types";

export default function HistoryPage() {
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("meal_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setLogs(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="text-sm text-stone-400 py-12 text-center">Loading…</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-heading text-2xl font-semibold text-stone-800">Meal History</h1>
        <Card className="text-center py-12 text-stone-400 text-sm">
          No analyses yet. Go to{" "}
          <a href="/analyze" className="text-primary hover:underline">Analyze</a> to get started.
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold text-stone-800">Meal History</h1>
      <ul className="flex flex-col gap-3">
        {logs.map((log) => (
          <li key={log.id}>
            <Card className="p-4 cursor-pointer" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-700 truncate">
                    {log.product_name ?? log.meal_description ?? "Manual entry"}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {new Date(log.created_at).toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                    })}
                    {" · "}
                    <span className="capitalize">{log.input_method}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-lg font-bold"
                    style={{
                      color: log.pcos_score >= 7 ? "#16A34A" : log.pcos_score >= 4 ? "#D97706" : "#DC2626",
                    }}
                  >
                    {log.pcos_score}/10
                  </span>
                  {expanded === log.id ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
                </div>
              </div>
            </Card>
            {expanded === log.id && (
              <div className="mt-2">
                <ResultCard result={log.analysis_result} mealLabel={log.product_name ?? log.meal_description ?? undefined} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/\(app\)/history/
git commit -m "feat: add meal history page with expandable result cards"
```

---

## Task 18: Profile Page

**Files:**
- Create: `app/(app)/profile/page.tsx`

**Step 1: Create the page**

```tsx
// app/(app)/profile/page.tsx
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import type { PrimaryConcern } from "@/types";

const concerns: { value: PrimaryConcern; label: string; description: string }[] = [
  { value: "general", label: "General PCOS", description: "Balanced analysis across all factors" },
  { value: "insulin_resistance", label: "Insulin Resistance", description: "Emphasises glycemic impact and blood sugar" },
  { value: "acne", label: "Acne / Androgens", description: "Focuses on androgen-triggering foods" },
  { value: "weight", label: "Weight Management", description: "Highlights caloric density and satiety" },
  { value: "fertility", label: "Fertility", description: "Flags endocrine disruptors prominently" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [concern, setConcern] = useState<PrimaryConcern>("general");
  const [age, setAge] = useState("");
  const [diagnosed, setDiagnosed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (data) {
        setConcern(data.primary_concern as PrimaryConcern);
        setAge(data.age?.toString() ?? "");
        setDiagnosed(data.diagnosed ?? false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").upsert({
      user_id: user.id,
      primary_concern: concern,
      age: age ? Number(age) : null,
      diagnosed,
    });
    setLoading(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); router.push("/dashboard"); }, 1200);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-stone-800">Your PCOS Profile</h1>
        <p className="text-stone-500 text-sm mt-1">This helps Claude personalise your analysis</p>
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-stone-700 mb-4">Primary concern</h2>
        <div className="flex flex-col gap-2">
          {concerns.map(({ value, label, description }) => (
            <button
              key={value}
              onClick={() => setConcern(value)}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-colors text-left ${
                concern === value
                  ? "border-primary bg-primary-soft/50"
                  : "border-stone-100 hover:border-stone-200"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 ${
                  concern === value ? "border-primary bg-primary" : "border-stone-300"
                }`}
              />
              <div>
                <p className="text-sm font-medium text-stone-800">{label}</p>
                <p className="text-xs text-stone-500">{description}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-stone-700 mb-4">About you</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-stone-500 mb-1 block">Age (optional)</label>
            <Input type="number" placeholder="e.g. 28" value={age} onChange={(e) => setAge(e.target.value)} className="max-w-[120px]" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={diagnosed}
              onChange={(e) => setDiagnosed(e.target.checked)}
              className="w-4 h-4 rounded accent-primary"
            />
            <span className="text-sm text-stone-700">I have a formal PCOS diagnosis</span>
          </label>
        </div>
      </Card>

      <Button onClick={handleSave} disabled={loading} size="lg">
        {saved ? "Saved!" : loading ? "Saving…" : "Save Profile"}
      </Button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/\(app\)/profile/
git commit -m "feat: add PCOS profile page with concern selector"
```

---

## Task 19: Education Page

**Files:**
- Create: `app/(app)/education/page.tsx`

**Step 1: Create the page**

```tsx
// app/(app)/education/page.tsx
import { Card } from "@/components/ui/Card";
import { CheckCircle, XCircle, BookOpen } from "lucide-react";

const friendlyFoods = [
  { name: "Leafy greens (spinach, kale)", reason: "Low GI, anti-inflammatory, high magnesium" },
  { name: "Berries", reason: "Low sugar, high antioxidants, reduce inflammation" },
  { name: "Fatty fish (salmon, sardines)", reason: "Omega-3s reduce androgens and inflammation" },
  { name: "Nuts & seeds (walnuts, flaxseed)", reason: "Healthy fats, fiber, lignans regulate hormones" },
  { name: "Legumes (lentils, chickpeas)", reason: "Slow carb release, high fiber, stabilise insulin" },
  { name: "Whole grains (oats, quinoa)", reason: "Low GI, B vitamins, sustained energy" },
  { name: "Cinnamon", reason: "Improves insulin sensitivity" },
  { name: "Apple cider vinegar", reason: "May improve insulin response when taken with meals" },
];

const foodsToAvoid = [
  { name: "White bread, white rice, white pasta", reason: "High GI — spikes blood sugar rapidly" },
  { name: "Sugary drinks (sodas, juices)", reason: "Liquid sugar bypasses satiety signals" },
  { name: "Processed snacks", reason: "Seed oils + refined sugar = double inflammation hit" },
  { name: "Excess dairy", reason: "May elevate androgens (IGF-1) in some women" },
  { name: "Alcohol", reason: "Stresses liver, disrupts hormone metabolism" },
  { name: "Artificial sweeteners (in excess)", reason: "May alter gut microbiome affecting insulin" },
];

export default function EducationPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-stone-800">PCOS Food Guide</h1>
        <p className="text-stone-500 text-sm mt-1">Evidence-based guidance for eating with PCOS</p>
      </div>

      {/* GI explainer */}
      <Card className="bg-primary-soft/40 border-primary/20">
        <div className="flex items-start gap-3">
          <BookOpen size={20} className="text-primary shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold text-stone-800 mb-2">Why Glycemic Index Matters for PCOS</h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              PCOS is strongly linked to insulin resistance — up to 70% of women with PCOS have it. 
              When you eat high-GI foods, blood sugar spikes sharply, forcing your pancreas to release 
              large amounts of insulin. High insulin stimulates the ovaries to produce more androgens 
              (testosterone), worsening PCOS symptoms like acne, hair loss, and irregular periods.
            </p>
            <p className="text-sm text-stone-600 leading-relaxed mt-2">
              Eating low-GI foods keeps insulin stable, which reduces androgen production and helps 
              regulate your cycle.
            </p>
          </div>
        </div>
      </Card>

      {/* Friendly foods */}
      <Card>
        <h2 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <CheckCircle size={16} className="text-green-500" />
          PCOS-Friendly Foods
        </h2>
        <ul className="flex flex-col gap-3">
          {friendlyFoods.map(({ name, reason }) => (
            <li key={name} className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-stone-700">{name}</p>
                <p className="text-xs text-stone-500">{reason}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Foods to limit */}
      <Card>
        <h2 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <XCircle size={16} className="text-red-400" />
          Foods to Limit
        </h2>
        <ul className="flex flex-col gap-3">
          {foodsToAvoid.map(({ name, reason }) => (
            <li key={name} className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-stone-700">{name}</p>
                <p className="text-xs text-stone-500">{reason}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Substitution cheat sheet */}
      <Card>
        <h2 className="text-sm font-semibold text-stone-700 mb-4">Quick Substitution Cheat Sheet</h2>
        <div className="flex flex-col gap-2">
          {[
            ["White rice", "Cauliflower rice or brown rice"],
            ["White bread", "Sourdough or Ezekiel bread"],
            ["Cow's milk", "Unsweetened oat milk or almond milk"],
            ["Sugary yogurt", "Plain Greek yogurt + berries"],
            ["Soda / juice", "Sparkling water + hibiscus or lemon"],
            ["Vegetable oil", "Extra virgin olive oil or avocado oil"],
            ["White pasta", "Chickpea pasta or courgette noodles"],
          ].map(([from, to]) => (
            <div key={from} className="flex items-center gap-3 text-sm">
              <span className="text-red-500 line-through text-xs w-32 shrink-0">{from}</span>
              <span className="text-stone-400">→</span>
              <span className="text-green-700">{to}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/\(app\)/education/
git commit -m "feat: add PCOS education and food guide page"
```

---

## Task 20: Landing Page

**Files:**
- Modify: `app/page.tsx`

**Step 1: Create landing page**

```tsx
// app/page.tsx
import Link from "next/link";
import { Leaf, ScanLine, BarChart2, User } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <Leaf className="text-primary" size={22} />
          <span className="font-heading font-semibold text-stone-800">CycleEats</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-stone-600 hover:text-stone-800 font-medium">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-soft text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <Leaf size={12} />
          AI-powered PCOS nutrition analysis
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-stone-800 leading-tight mb-4">
          Eat smarter for <span className="text-primary">PCOS</span>
        </h1>
        <p className="text-stone-500 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
          Describe a meal, scan a barcode, or enter nutrition facts. CycleEats analyses every choice 
          against your specific PCOS concerns and tells you exactly what to swap.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-primary text-white text-base font-medium px-8 py-3.5 rounded-xl hover:bg-primary/90 transition-colors"
        >
          Start for free
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: ScanLine,
              title: "3 Ways to Analyse",
              body: "Describe your meal in plain English, scan a product barcode with your camera, or type in nutrition label values.",
            },
            {
              icon: BarChart2,
              title: "PCOS-Specific Scoring",
              body: "Every meal gets scored 1–10 across insulin impact, androgen risk, inflammation, and fiber — tailored to your primary concern.",
            },
            {
              icon: User,
              title: "Your Profile, Your Weights",
              body: "Tell CycleEats whether you're focused on insulin resistance, acne, fertility, or weight. The AI adjusts its analysis accordingly.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
              <div className="w-10 h-10 bg-primary-soft rounded-xl flex items-center justify-center mb-4">
                <Icon size={20} className="text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-stone-800 mb-2">{title}</h3>
              <p className="text-sm text-stone-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add landing page with hero and feature highlights"
```

---

## Task 21: Final Verification

**Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 2: Production build**

```bash
npm run build
```
Expected: all pages compile, no build errors.

**Step 3: Manual smoke test — golden paths**

Start the dev server: `npm run dev`

Test each of these:
- [ ] Visit `/` — landing page renders correctly
- [ ] Visit `/signup` — create a test account
- [ ] After signup, lands on `/profile` — set concern to "Insulin Resistance", save
- [ ] Lands on `/dashboard` — shows empty state charts
- [ ] Go to `/analyze` → "Describe Meal" tab → type "oatmeal with berries" → click Analyze
- [ ] ResultCard renders with score ring, badges, flagged/safe sections, substitutions
- [ ] Go to `/dashboard` — score appears in stats, recent log visible
- [ ] Go to `/history` — log visible, click to expand ResultCard
- [ ] Go to `/analyze` → "Barcode" tab — if on mobile/camera available, test scan; otherwise check manual fallback
- [ ] Go to `/education` — all content renders
- [ ] Resize to mobile width (375px) — bottom nav visible, sidebar hidden, layout stacks correctly

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete CycleEats MVP"
```

---

## Task 22: Deploy to Vercel

**Step 1: Push to GitHub**

```bash
git remote add origin https://github.com/<your-username>/cycleeats.git
git push -u origin main
```

**Step 2: Deploy on Vercel**

1. Go to [vercel.com](https://vercel.com) and import the GitHub repo
2. In "Environment Variables", add all four keys from your `.env.local`
3. Click Deploy

**Step 3: Update Supabase redirect URLs**

In Supabase dashboard → Authentication → URL Configuration:
- Site URL: `https://your-vercel-domain.vercel.app`
- Add to Redirect URLs: `https://your-vercel-domain.vercel.app/**`

**Step 4: Verify production**

Visit your Vercel URL, create an account, run an analysis. Confirm it works end-to-end in production.

---

## Summary

| Task | What it builds |
|---|---|
| 1 | Next.js scaffold + Tailwind config |
| 2 | TypeScript types |
| 3 | Supabase client/server/middleware |
| 4 | Claude analysis utility |
| 5 | Open Food Facts utility |
| 6 | Supabase project + schema + RLS |
| 7 | API routes (`/api/analyze`, `/api/barcode`) |
| 8 | UI primitives (Button, Card, Badge, Input) |
| 9 | Layout components (Sidebar, MobileNav) |
| 10 | Root + app layouts |
| 11 | Auth pages (login, signup) |
| 12 | ScoreRing component |
| 13 | ResultCard component |
| 14 | Analysis input components |
| 15 | Analyze page |
| 16 | Dashboard + TrendChart |
| 17 | History page |
| 18 | Profile page |
| 19 | Education page |
| 20 | Landing page |
| 21 | Final verification |
| 22 | Vercel deployment |
