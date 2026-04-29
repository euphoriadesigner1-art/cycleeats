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
