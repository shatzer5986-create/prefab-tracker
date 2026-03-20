"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "prefab-tracker-v7";

type AllocationRow = {
  id: number;
  prefab_id: number;
  material_id: number;
  quantity_allocated: number;
};

type Material = {
  id: number;
  item: string;
  job: string;
};

type PrefabItem = {
  id: number;
  assembly?: string;
  area?: string;
  job: string;
};

type AppData = {
  materials?: Material[];
  prefab?: PrefabItem[];
};

export default function PrefabAllocationTable() {
  const [data, setData] = useState<AllocationRow[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [prefabItems, setPrefabItems] = useState<PrefabItem[]>([]);

  useEffect(() => {
    fetch("/api/prefabAllocation")
      .then((res) => res.json())
      .then((rows) => setData(rows))
      .catch((err) => console.error("Failed to load allocations:", err));

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed: AppData = JSON.parse(raw);
      setMaterials(parsed.materials || []);
      setPrefabItems(parsed.prefab || []);
    } catch (err) {
      console.error("Failed to read app data from localStorage:", err);
    }
  }, []);

  function getMaterialName(id: number) {
    const material = materials.find((m) => m.id === id);
    return material ? `${material.job} - ${material.item}` : `Material ID ${id}`;
  }

  function getPrefabName(id: number) {
    const prefab = prefabItems.find((p) => p.id === id);
    return prefab
      ? `${prefab.job} - ${prefab.assembly || "No Assembly"} - ${prefab.area || "No Area"}`
      : `Prefab ID ${id}`;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border text-gray-900 bg-white">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2 text-left">ID</th>
            <th className="border p-2 text-left">Prefab</th>
            <th className="border p-2 text-left">Material</th>
            <th className="border p-2 text-left">Qty</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              <td className="border p-2">{row.id}</td>
              <td className="border p-2">{getPrefabName(row.prefab_id)}</td>
              <td className="border p-2">{getMaterialName(row.material_id)}</td>
              <td className="border p-2">{row.quantity_allocated}</td>
            </tr>
          ))}

          {data.length === 0 && (
            <tr>
              <td className="border p-2 text-center" colSpan={4}>
                No allocations yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}