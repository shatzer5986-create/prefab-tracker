"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AppShell from "@/components/AppShell";
import Section from "@/components/Section";
import StatCard from "@/components/StatCard";

import type { EquipmentItem } from "@/types";

export default function AssetsDashboardPage() {
  const [assets, setAssets] = useState<EquipmentItem[]>([]);

  useEffect(() => {
    async function loadAssets() {
      try {
        const response = await fetch("/api/assets", { cache: "no-store" });
        const data = response.ok ? await response.json() : [];
        setAssets(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Loading assets failed:", error);
        setAssets([]);
      }
    }

    loadAssets();
  }, []);

  const trailers = useMemo(
    () => assets.filter((item) => item.assetType === "Trailer"),
    [assets]
  );

  const vehicles = useMemo(
    () => assets.filter((item) => item.assetType === "Vehicle"),
    [assets]
  );

  const equipment = useMemo(
    () => assets.filter((item) => item.assetType === "Equipment"),
    [assets]
  );

  const assignedAssets = useMemo(
    () => assets.filter((item) => String(item.jobNumber || "").trim() !== "").length,
    [assets]
  );

  const damagedAssets = useMemo(
    () => assets.filter((item) => item.status === "Damaged").length,
    [assets]
  );

  return (
    <AppShell
      title="Assets"
      subtitle="Fleet and equipment overview."
      active="assets"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <StatCard title="All Assets" value={String(assets.length)} />
        <StatCard title="Trailers" value={String(trailers.length)} />
        <StatCard title="Vehicles" value={String(vehicles.length)} />
        <StatCard title="Equipment" value={String(equipment.length)} />
        <StatCard title="Assigned" value={String(assignedAssets)} />
        <StatCard title="Damaged" value={String(damagedAssets)} />
      </div>

      <Section title="Asset Pages" collapsible defaultOpen>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          <AssetPageCard
            title="Trailers"
            value={`${trailers.length} assets`}
            description="View, search, import, and export trailer records."
            href="/assets/trailers"
          />

          <AssetPageCard
            title="Vehicles"
            value={`${vehicles.length} assets`}
            description="View, search, import, and export vehicle records."
            href="/assets/vehicles"
          />

          <AssetPageCard
            title="Equipment"
            value={`${equipment.length} assets`}
            description="View, search, import, and export equipment records."
            href="/assets/equipment"
          />
        </div>
      </Section>
    </AppShell>
  );
}

function AssetPageCard({
  title,
  value,
  description,
  href,
}: {
  title: string;
  value: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #2f2f2f",
          borderRadius: 12,
          padding: 18,
          display: "grid",
          gap: 8,
          minHeight: 150,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, color: "#f5f5f5" }}>{title}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#f97316" }}>{value}</div>
        <div style={{ color: "#d1d5db", lineHeight: 1.5 }}>{description}</div>
        <div
          style={{
            marginTop: 6,
            color: "#f97316",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Open →
        </div>
      </div>
    </Link>
  );
}