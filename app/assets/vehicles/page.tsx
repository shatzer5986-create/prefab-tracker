"use client";

import AssetManagerPage from "@/components/AssetManagerPage";

export default function VehiclesPage() {
  return (
    <AssetManagerPage
      assetType="Vehicle"
      title="Vehicles"
      description="Vehicle inventory, import, export, and editing."
    />
  );
}