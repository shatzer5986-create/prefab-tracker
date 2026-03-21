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
      {
        error: "Failed to load jobs",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const jobNumber = String(body.jobNumber ?? "").trim();
    const name = String(body.name ?? "").trim();
    const customer =
      body.customer === undefined || body.customer === null
        ? null
        : String(body.customer).trim() || null;
    const status =
      body.status === undefined || body.status === null
        ? "Active"
        : String(body.status).trim() || "Active";

    if (!jobNumber) {
      return NextResponse.json(
        { error: "Job number is required" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Job name is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.job.findUnique({
      where: { jobNumber },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A job with that number already exists" },
        { status: 409 }
      );
    }

    const job = await prisma.job.create({
      data: {
        jobNumber,
        name,
        customer,
        status,
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("POST /api/jobs failed:", error);

    return NextResponse.json(
      {
        error: "Failed to create job",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}