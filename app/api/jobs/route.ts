import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const jobs = await prisma.job.findMany({
      orderBy: [{ jobNumber: "asc" }],
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("GET /api/jobs failed:", error);
    return NextResponse.json(
      { error: "Failed to load jobs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const jobNumber = String(body.jobNumber ?? "").trim();
    const name = String(body.name ?? "").trim();
    const customer = String(body.customer ?? "").trim();
    const status = String(body.status ?? "Active").trim();

    if (!jobNumber || !name) {
      return NextResponse.json(
        { error: "jobNumber and name are required" },
        { status: 400 }
      );
    }

    const created = await prisma.job.create({
      data: {
        jobNumber,
        name,
        customer: customer || null,
        status: status || "Active",
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/jobs failed:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A job with that job number already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}