import { NextRequest, NextResponse } from "next/server";
import { analyzeWithClaude } from "@/lib/claude";
import type { AnalyzeRequest } from "@/types";

// Extend Vercel serverless timeout — vision calls can take 20-30 s
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

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
    const message =
      error instanceof Error ? error.message : "Analysis failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
