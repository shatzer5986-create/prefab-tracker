"use client";

import Papa from "papaparse";
import { useEffect, useMemo, useState } from "react";

import { buttonStyle } from "@/components/TableBits";
import AppShell from "@/components/AppShell";
import Section from "@/components/Section";
import StatCard from "@/components/StatCard";
import ToolForm from "@/components/ToolForm";
import ToolTable from "@/components/ToolTable";

import type { Employee, Job, ToolItem } from "@/types";

const EXTRA_JOB_OPTIONS = ["Yard", "Tool Room", "Shop", "WH1", "WH2"];

const emptyToolForm: Omit<ToolItem, "id"> = {
  category: "",
  barcode: "",
  itemNumber: "",
  manufacturer: "",
  model: "",
  description: "",
  quantityAvailable: 1,
  jobNumber: "",
  assignmentType: "Job",
  assignedTo: "",
  toolRoomLocation: "",
  serialNumber: "",
  transferDateIn: "",
  transferDateOut: "",
  status: "Working",
};

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function dedupeStrings(values: string[]) {
  return values.filter((value, index, arr) => arr.indexOf(value) === index);
}

function isStorageLocation(value: string) {
  const normalized = safeString(value).toLowerCase();
  return ["tool room", "shop", "yard", "wh1", "wh2"].includes(normalized);
}

function normalizeAssignmentType(
  jobNumber: string,
  assignedTo = "",
  currentAssignmentType = ""
): ToolItem["assignmentType"] {
  const normalizedJob = safeString(jobNumber);
  const normalizedAssignedTo = safeString(assignedTo);
  const normalizedType = safeString(currentAssignmentType);

  if (normalizedAssignedTo) return "Person";
  if (normalizedJob === "Tool Room") return "Tool Room";
  if (normalizedJob === "Shop") return "Shop";
  if (normalizedJob === "Yard") return "Yard";
  if (normalizedJob === "WH1") return "WH1";
  if (normalizedJob === "WH2") return "WH2";
  if (normalizedType === "Person") return "Person";
  return "Job";
}

function normalizeToolStatus(status: unknown): ToolItem["status"] {
  const value = safeString(status);
  if (value === "Damaged" || value === "Working") return value;
  if (value === "Needs Repair" || value === "Missing") return "Damaged";
  return "Working";
}

function normalizeHeader(value: unknown) {
  return safeString(value).toLowerCase().replace(/\s+/g, " ");
}

function getCell(row: Record<string, unknown>, header: string) {
  const normalizedTarget = normalizeHeader(header);
  const foundKey = Object.keys(row).find(
    (key) => normalizeHeader(key) === normalizedTarget
  );
  return foundKey ? row[foundKey] : "";
}

function parseQty(value: unknown, fallback = 1) {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const parsed = Number(String(value ?? "").trim());
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseCsvDate(value: unknown) {
  const raw = safeString(value);
  if (!raw) return "";

  const asDate = new Date(raw);
  if (!Number.isNaN(asDate.getTime())) {
    const yyyy = asDate.getFullYear();
    const mm = String(asDate.getMonth() + 1).padStart(2, "0");
    const dd = String(asDate.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return raw;
}

function buildToolMatchKey(
  item: Pick<
    ToolItem,
    "barcode" | "itemNumber" | "manufacturer" | "model" | "description"
  >
) {
  return [
    safeString(item.barcode).toLowerCase(),
    safeString(item.itemNumber).toLowerCase(),
    safeString(item.manufacturer).toLowerCase(),
    safeString(item.model).toLowerCase(),
    safeString(item.description).toLowerCase(),
  ].join("||");
}

function mergeImportedTools(existing: ToolItem[], imported: Omit<ToolItem, "id">[]) {
  const existingByKey = new Map<string, ToolItem>();

  for (const item of existing) {
    existingByKey.set(buildToolMatchKey(item), item);
  }

  const toCreate: Omit<ToolItem, "id">[] = [];
  const toUpdate: ToolItem[] = [];

  for (const item of imported) {
    const key = buildToolMatchKey(item);
    const existingMatch = existingByKey.get(key);

    if (existingMatch) {
      toUpdate.push({
        ...existingMatch,
        ...item,
        id: existingMatch.id,
      });
    } else {
      toCreate.push(item);
    }
  }

  return { toCreate, toUpdate };
}

function parseImportedToolRow(row: Record<string, unknown>): Omit<ToolItem, "id"> {
  const jobNumber = safeString(getCell(row, "Job#"));
  const assignedTo = safeString(getCell(row, "Assigned to"));
  const assignmentType = normalizeAssignmentType(jobNumber, assignedTo);
  const status = normalizeToolStatus(getCell(row, "Status"));

  return {
    category: safeString(getCell(row, "Category")),
    barcode: safeString(getCell(row, "Barcode")),
    itemNumber: safeString(getCell(row, "Item Number")),
    manufacturer: safeString(getCell(row, "Manufacturer")),
    model: safeString(getCell(row, "Model")),
    description: safeString(getCell(row, "Description")),
    quantityAvailable: parseQty(getCell(row, "Quantity"), 1),
    jobNumber: assignmentType === "Job" ? jobNumber : "",
    assignmentType,
    assignedTo,
    toolRoomLocation: isStorageLocation(jobNumber) ? jobNumber : "",
    serialNumber: safeString(getCell(row, "Serial Number")),
    transferDateIn: parseCsvDate(getCell(row, "Transfer Date")),
    transferDateOut: parseCsvDate(getCell(row, "Return Date")),
    status,
  };
}

export default function ToolManagerPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<ToolItem, "id">>(emptyToolForm);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [jobsRes, toolsRes] = await Promise.all([
          fetch("/api/jobs", { cache: "no-store" }),
          fetch("/api/tools", { cache: "no-store" }),
        ]);

        const jobsData = jobsRes.ok ? await jobsRes.json() : [];
        const toolsData = toolsRes.ok ? await toolsRes.json() : [];

        setJobs(Array.isArray(jobsData) ? jobsData : []);
        setTools(Array.isArray(toolsData) ? toolsData : []);
      } catch (error) {
        console.error("Loading tools page data failed:", error);
        setJobs([]);
        setTools([]);
      }
    }

    loadData();
  }, []);

  const jobOptions = useMemo(() => {
    return dedupeStrings([
      ...jobs.map((job) => job.jobNumber).sort(),
      ...EXTRA_JOB_OPTIONS,
    ]).sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const employeeOptions = useMemo(() => {
  return [...employees]
    .map((employee) => employee.name)
    .filter((name) => name?.trim())
    .sort((a, b) => a.localeCompare(b));
}, [employees]);

  const assignedCount = useMemo(
    () =>
      tools.filter(
        (item) =>
          safeString(item.jobNumber) !== "" ||
          safeString(item.assignedTo) !== "" ||
          isStorageLocation(item.toolRoomLocation)
      ).length,
    [tools]
  );

  const damagedCount = useMemo(
    () => tools.filter((item) => item.status === "Damaged").length,
    [tools]
  );

  const toolRoomCount = useMemo(
    () =>
      tools.filter(
        (item) =>
          item.assignmentType === "Tool Room" ||
          safeString(item.toolRoomLocation) === "Tool Room"
      ).length,
    [tools]
  );

  function resetForm() {
    setForm(emptyToolForm);
    setEditingId(null);
  }

  async function reloadTools() {
    const response = await fetch("/api/tools", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load tools");
    const data = await response.json();
    setTools(Array.isArray(data) ? data : []);
  }

  async function handleSave() {
    const hasMinimumData =
      safeString(form.description) ||
      safeString(form.itemNumber) ||
      safeString(form.barcode) ||
      safeString(form.manufacturer) ||
      safeString(form.model) ||
      safeString(form.category);

    if (!hasMinimumData) {
      alert(
        "Enter at least a description, item number, barcode, manufacturer, model, or category."
      );
      return;
    }

    const nextAssignmentType = normalizeAssignmentType(
      safeString(form.jobNumber),
      safeString(form.assignedTo),
      safeString(form.assignmentType)
    );

    const payload: Omit<ToolItem, "id"> = {
      ...form,
      jobNumber: nextAssignmentType === "Job" ? safeString(form.jobNumber) : "",
      assignmentType: nextAssignmentType,
      assignedTo: nextAssignmentType === "Person" ? safeString(form.assignedTo) : "",
      toolRoomLocation: isStorageLocation(safeString(form.jobNumber))
        ? safeString(form.jobNumber)
        : nextAssignmentType === "Tool Room" ||
          nextAssignmentType === "Shop" ||
          nextAssignmentType === "Yard" ||
          nextAssignmentType === "WH1" ||
          nextAssignmentType === "WH2"
        ? nextAssignmentType
        : "",
      status: normalizeToolStatus(form.status),
    };

    try {
      setIsBusy(true);

      const response =
        editingId !== null
          ? await fetch(`/api/tools/${editingId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch("/api/tools", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

      if (!response.ok) {
        throw new Error(editingId !== null ? "Failed to update tool" : "Failed to create tool");
      }

      await reloadTools();
      resetForm();
    } catch (error) {
      console.error("Saving tool failed:", error);
      alert("Failed to save tool.");
    } finally {
      setIsBusy(false);
    }
  }

  function handleEdit(row: ToolItem) {
    const editLocation =
      row.assignmentType === "Job"
        ? safeString(row.jobNumber)
        : row.assignmentType === "Person"
        ? ""
        : safeString(row.toolRoomLocation) || safeString(row.assignmentType);

    setForm({
      category: safeString(row.category),
      barcode: safeString(row.barcode),
      itemNumber: safeString(row.itemNumber),
      manufacturer: safeString(row.manufacturer),
      model: safeString(row.model),
      description: safeString(row.description),
      quantityAvailable: Number(row.quantityAvailable) || 0,
      jobNumber: editLocation,
      assignmentType: row.assignmentType,
      assignedTo: safeString(row.assignedTo),
      toolRoomLocation: safeString(row.toolRoomLocation),
      serialNumber: safeString(row.serialNumber),
      transferDateIn: safeString(row.transferDateIn),
      transferDateOut: safeString(row.transferDateOut),
      status: normalizeToolStatus(row.status),
    });

    setEditingId(row.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: number) {
    try {
      setIsBusy(true);

      const response = await fetch(`/api/tools/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete tool");
      }

      await reloadTools();

      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error("Deleting tool failed:", error);
      alert("Failed to delete tool.");
    } finally {
      setIsBusy(false);
    }
  }

  function importToolsFromCsv(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          setIsBusy(true);

          const rawRows = Array.isArray(results.data) ? results.data : [];

          const cleanedRows = rawRows.filter((row) => {
            return (
              safeString(getCell(row, "Category")) ||
              safeString(getCell(row, "Barcode")) ||
              safeString(getCell(row, "Item Number")) ||
              safeString(getCell(row, "Manufacturer")) ||
              safeString(getCell(row, "Model")) ||
              safeString(getCell(row, "Description"))
            );
          });

          if (!cleanedRows.length) {
            alert("No valid tool rows found in the CSV file.");
            return;
          }

          const importedTools = cleanedRows.map((row) => parseImportedToolRow(row));
          const { toCreate, toUpdate } = mergeImportedTools(tools, importedTools);

          for (const row of toUpdate) {
            const response = await fetch(`/api/tools/${row.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                category: row.category,
                barcode: row.barcode,
                itemNumber: row.itemNumber,
                manufacturer: row.manufacturer,
                model: row.model,
                description: row.description,
                quantityAvailable: row.quantityAvailable,
                jobNumber: row.jobNumber,
                assignmentType: row.assignmentType,
                assignedTo: row.assignedTo,
                toolRoomLocation: row.toolRoomLocation,
                serialNumber: row.serialNumber,
                transferDateIn: row.transferDateIn,
                transferDateOut: row.transferDateOut,
                status: row.status,
              }),
            });

            if (!response.ok) {
              throw new Error(`Failed to update tool ${row.description || row.itemNumber || row.id}`);
            }
          }

          for (const row of toCreate) {
            const response = await fetch("/api/tools", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(row),
            });

            if (!response.ok) {
              throw new Error(`Failed to create tool ${row.description || row.itemNumber || ""}`);
            }
          }

          await reloadTools();

          alert(
            `Imported ${importedTools.length} tool row(s). Created ${toCreate.length}, updated ${toUpdate.length}.`
          );
        } catch (error) {
          console.error("Tool CSV import failed:", error);
          alert("Failed to import tool CSV file.");
        } finally {
          setIsBusy(false);
        }
      },
      error: (error) => {
        console.error("Tool CSV parse failed:", error);
        alert("Failed to read tool CSV file.");
      },
    });

    event.target.value = "";
  }

  function exportToolsReport() {
    const csvRows = [
      [
        "Category",
        "Barcode",
        "Item Number",
        "Manufacturer",
        "Model",
        "Description",
        "Quantity",
        "Job#",
        "Assigned to",
        "Assignment Type",
        "Location",
        "Transfer Date",
        "Return Date",
        "Status",
      ],
      ...tools.map((item) => [
        item.category,
        item.barcode,
        item.itemNumber,
        item.manufacturer,
        item.model,
        item.description,
        item.quantityAvailable,
        item.jobNumber,
        item.assignedTo,
        item.assignmentType,
        item.toolRoomLocation,
        item.transferDateIn,
        item.transferDateOut,
        item.status,
      ]),
    ];

    const csv = csvRows
      .map((row) =>
        row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tool-inventory-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell
      title="Tools"
      subtitle="Tool inventory, import, export, and editing."
      active="tools"
      actions={
        <>
          <label
            style={{
              ...buttonStyle,
              opacity: isBusy ? 0.7 : 1,
              cursor: isBusy ? "not-allowed" : "pointer",
            }}
          >
            {isBusy ? "Working..." : "Import Tools from CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={importToolsFromCsv}
              style={{ display: "none" }}
              disabled={isBusy}
            />
          </label>

          <button
            type="button"
            onClick={exportToolsReport}
            style={buttonStyle}
            disabled={isBusy}
          >
            Export Tools Report
          </button>
        </>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <StatCard title="All Tools" value={String(tools.length)} />
        <StatCard title="Assigned" value={String(assignedCount)} />
        <StatCard title="Tool Room" value={String(toolRoomCount)} />
        <StatCard title="Damaged" value={String(damagedCount)} />
      </div>

      <Section
        title={editingId !== null ? "Edit Tool" : "Add Tool"}
        collapsible
        defaultOpen={false}
      >
        <ToolForm
          form={form}
          setForm={setForm}
          editingId={editingId}
          onSave={handleSave}
          onCancel={resetForm}
          existingTools={tools}
          jobOptions={jobOptions}
          employeeOptions={employeeOptions}
        />
      </Section>

      <Section title="Tool List" collapsible defaultOpen>
        <ToolTable rows={tools} onEdit={handleEdit} onDelete={handleDelete} />
      </Section>
    </AppShell>
  );
}