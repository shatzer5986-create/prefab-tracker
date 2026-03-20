"use client";

import Link from "next/link";
import Section from "@/components/Section";
import PrefabAllocationForm from "@/components/PrefabAllocationForm";
import PrefabAllocationTable from "@/components/PrefabAllocationTable";
import PrefabAutoAllocate from "@/components/PrefabAutoAllocate";

export default function AllocationsPage() {
  return (
    <div className="space-y-6 text-gray-900 bg-white p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prefab Allocations</h1>

        <Link
          href="/"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-100"
        >
          Back to Dashboard
        </Link>
      </div>

      <Section title="Auto Allocate From BOM">
        <PrefabAutoAllocate />
      </Section>

      <Section title="Add Manual Allocation">
        <PrefabAllocationForm />
      </Section>

      <Section title="Allocation List">
        <PrefabAllocationTable />
      </Section>
    </div>
  );
}