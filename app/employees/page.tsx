"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Section from "@/components/Section";
import InputBlock, { inputStyle } from "@/components/InputBlock";
import {
  buttonStyle,
  secondaryButtonStyle,
  formGrid,
  tableStyle,
  Th,
  Td,
  TableWrapper,
  ActionButtons,
} from "@/components/TableBits";

type EmployeeRow = {
  id: number;
  name: string;
  title: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const emptyForm = {
  name: "",
  title: "",
  email: "",
  phone: "",
  isActive: true,
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadEmployees() {
    try {
      setIsLoading(true);
      setLoadError("");

      const response = await fetch("/api/employees", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load employees");

      const data = await response.json();
      const rows = Array.isArray(data) ? data : [];

      const cleaned: EmployeeRow[] = rows
        .filter((row) => row && typeof row === "object")
        .map((row) => ({
          id: Number(row.id) || Date.now(),
          name: String(row.name ?? "").trim(),
          title: String(row.title ?? "").trim(),
          email: String(row.email ?? "").trim(),
          phone: String(row.phone ?? "").trim(),
          isActive: row.isActive !== false,
          createdAt: row.createdAt ? String(row.createdAt) : "",
          updatedAt: row.updatedAt ? String(row.updatedAt) : "",
        }))
        .filter((row) => row.name);

      setEmployees(cleaned);
    } catch (error) {
      console.error("Failed to load employees:", error);
      setEmployees([]);
      setLoadError("Failed to load employees");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;

    return employees.filter((employee) => {
      return (
        employee.name.toLowerCase().includes(term) ||
        employee.title.toLowerCase().includes(term) ||
        String(employee.email ?? "").toLowerCase().includes(term) ||
        String(employee.phone ?? "").toLowerCase().includes(term)
      );
    });
  }, [employees, search]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSaveEmployee() {
    const name = form.name.trim();
    const title = form.title.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const isActive = !!form.isActive;

    if (!name) {
      alert("Employee name is required.");
      return;
    }

    const duplicate = employees.find(
      (employee) =>
        employee.name.trim().toLowerCase() === name.toLowerCase() &&
        employee.id !== editingId
    );

    if (duplicate) {
      alert("An employee with that name already exists.");
      return;
    }

    try {
      setIsSaving(true);

      if (editingId !== null) {
        const response = await fetch(`/api/employees/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            title,
            email,
            phone,
            isActive,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update employee");
        }
      } else {
        const response = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            title,
            email,
            phone,
            isActive,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create employee");
        }
      }

      await loadEmployees();
      resetForm();
    } catch (error) {
      console.error("Failed to save employee:", error);
      alert(error instanceof Error ? error.message : "Failed to save employee.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditEmployee(employee: EmployeeRow) {
    setForm({
      name: employee.name ?? "",
      title: employee.title ?? "",
      email: employee.email ?? "",
      phone: employee.phone ?? "",
      isActive: employee.isActive !== false,
    });
    setEditingId(employee.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeleteEmployee(id: number) {
    const employee = employees.find((row) => row.id === id);
    const confirmed = window.confirm(
      `Delete employee${employee?.name ? ` "${employee.name}"` : ""}?`
    );
    if (!confirmed) return;

    try {
      setIsSaving(true);

      const response = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete employee");
      }

      await loadEmployees();

      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error("Failed to delete employee:", error);
      alert(error instanceof Error ? error.message : "Failed to delete employee.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleImportEmployees(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSaving(true);

      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        alert("The CSV file is empty or missing data rows.");
        e.target.value = "";
        return;
      }

      const dataLines = lines.slice(1);

      const importedRows = dataLines
        .map((line) => {
          const parts = line.split(",").map((part) =>
            part.replace(/^"|"$/g, "").trim()
          );

          return {
            name: parts[0] ?? "",
            email: parts[1] ?? "",
            phone: parts[2] ?? "",
            title: parts[3] ?? "",
            isActive: true,
          };
        })
        .filter((row) => row.name);

      if (importedRows.length === 0) {
        alert("No valid employees were found in the file.");
        e.target.value = "";
        return;
      }

      const existingNames = new Set(
        employees.map((employee) => employee.name.trim().toLowerCase())
      );

      const uniqueImports = importedRows.filter((row) => {
        const key = row.name.trim().toLowerCase();
        if (!key || existingNames.has(key)) return false;
        existingNames.add(key);
        return true;
      });

      if (uniqueImports.length === 0) {
        alert("All imported employees already exist.");
        e.target.value = "";
        return;
      }

      for (const row of uniqueImports) {
        const response = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Failed importing ${row.name}`);
        }
      }

      await loadEmployees();
      alert(`Imported ${uniqueImports.length} employee(s).`);
    } catch (error) {
      console.error("Failed to import employees:", error);
      alert(error instanceof Error ? error.message : "Failed to import employees.");
    } finally {
      setIsSaving(false);
      e.target.value = "";
    }
  }

  function downloadEmployeeTemplate() {
    const csv = [
      "name,email,phone,title",
      "John Doe,john.doe@email.com,555-555-5555,Foreman",
      "Jane Smith,jane.smith@email.com,555-555-1111,Superintendent",
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "employee-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <div style={heroStyle}>
          <div>
            <Link href="/" style={backLinkStyle}>
              ← Back to Dashboard
            </Link>

            <h1 style={heroTitleStyle}>Employees</h1>

            <p style={heroSubtitleStyle}>
              Manage the employee list used across request forms and dropdowns.
            </p>

            {loadError ? (
              <p style={{ color: "#fca5a5", fontWeight: 700, marginTop: 10 }}>
                {loadError}
              </p>
            ) : null}
          </div>
        </div>

        <Section title={editingId !== null ? "Edit Employee" : "Add Employee"} defaultOpen>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={formGrid}>
              <InputBlock label="Employee Name">
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  style={inputStyle}
                  placeholder="Enter employee name"
                />
              </InputBlock>

              <InputBlock label="Position / Title">
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  style={inputStyle}
                  placeholder="Enter title"
                />
              </InputBlock>

              <InputBlock label="Email">
                <input
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  style={inputStyle}
                  placeholder="Enter email"
                />
              </InputBlock>

              <InputBlock label="Phone">
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  style={inputStyle}
                  placeholder="Enter phone number"
                />
              </InputBlock>

              <InputBlock label="Status">
                <select
                  value={form.isActive ? "Active" : "Inactive"}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      isActive: e.target.value === "Active",
                    }))
                  }
                  style={inputStyle}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </InputBlock>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleSaveEmployee}
                style={buttonStyle}
                disabled={isSaving}
              >
                {isSaving
                  ? "Saving..."
                  : editingId !== null
                  ? "Update Employee"
                  : "Add Employee"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                style={secondaryButtonStyle}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </div>
        </Section>

        <Section title="Import / Tools" defaultOpen>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ cursor: isSaving ? "not-allowed" : "pointer", opacity: isSaving ? 0.6 : 1 }}>
              <input
                type="file"
                accept=".csv"
                onChange={handleImportEmployees}
                style={{ display: "none" }}
                disabled={isSaving}
              />
              <span style={buttonStyle}>{isSaving ? "Working..." : "Import Employees"}</span>
            </label>

            <button
              type="button"
              onClick={downloadEmployeeTemplate}
              style={secondaryButtonStyle}
              disabled={isSaving}
            >
              Download Template
            </button>

            <button
              type="button"
              onClick={loadEmployees}
              style={secondaryButtonStyle}
              disabled={isSaving}
            >
              Refresh
            </button>
          </div>

          <p style={{ marginTop: 12, opacity: 0.75 }}>
            CSV columns should be: <strong>name,email,phone,title</strong>
          </p>
        </Section>

        <Section title="Employee List" defaultOpen>
          <div style={{ display: "grid", gap: 16 }}>
            <InputBlock label="Search">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={inputStyle}
                placeholder="Search employees"
              />
            </InputBlock>

            <TableWrapper>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Title</Th>
                    <Th>Email</Th>
                    <Th>Phone</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <Td colSpan={6}>Loading employees...</Td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <Td colSpan={6}>No employees found.</Td>
                    </tr>
                  ) : (
                    filteredEmployees
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((employee) => (
                        <tr key={employee.id}>
                          <Td>{employee.name}</Td>
                          <Td>{employee.title || "-"}</Td>
                          <Td>{employee.email || "-"}</Td>
                          <Td>{employee.phone || "-"}</Td>
                          <Td>{employee.isActive ? "Active" : "Inactive"}</Td>
                          <Td>
                            <ActionButtons
                              onEdit={() => handleEditEmployee(employee)}
                              onDelete={() => handleDeleteEmployee(employee.id)}
                            />
                          </Td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </TableWrapper>
          </div>
        </Section>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#111111",
  padding: "24px",
  fontFamily: "Arial, sans-serif",
  color: "#f5f5f5",
};

const containerStyle: React.CSSProperties = {
  maxWidth: "1450px",
  margin: "0 auto",
  display: "grid",
  gap: 24,
};

const heroStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2f2f2f",
  borderRadius: 16,
  padding: 20,
};

const heroTitleStyle: React.CSSProperties = {
  fontSize: "32px",
  margin: 0,
  color: "#f5f5f5",
};

const heroSubtitleStyle: React.CSSProperties = {
  color: "#d1d5db",
  margin: "8px 0 0 0",
};

const backLinkStyle: React.CSSProperties = {
  display: "inline-block",
  marginBottom: 10,
  color: "#f97316",
  textDecoration: "none",
  fontWeight: 700,
};