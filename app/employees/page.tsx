"use client";

import { useEffect, useMemo, useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import Section from "@/components/Section";
import StatCard from "@/components/StatCard";

import type { Employee } from "@/types";

const emptyEmployeeForm: Omit<Employee, "id"> = {
  name: "",
  title: "",
  isActive: true,
};

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Employee, "id">>(emptyEmployeeForm);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadEmployees() {
    try {
      setLoading(true);
      const response = await fetch("/api/employees", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Failed to load employees");
      }

      const rows = await response.json();
      setEmployees(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error("Loading employees failed:", error);
      alert("Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.isActive),
    [employees]
  );

  const inactiveEmployees = useMemo(
    () => employees.filter((employee) => !employee.isActive),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;

    return employees.filter((employee) =>
      [employee.name, employee.title, employee.isActive ? "active" : "inactive"]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [employees, search]);

  function resetForm() {
    setForm(emptyEmployeeForm);
    setEditingId(null);
  }

  async function handleSave() {
    const name = safeString(form.name);
    const title = safeString(form.title);

    if (!name) {
      alert("Enter an employee name.");
      return;
    }

    try {
      setSaving(true);

      if (editingId !== null) {
        const response = await fetch(`/api/employees/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            title,
            isActive: form.isActive,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || "Failed to update employee");
        }
      } else {
        const duplicate = employees.find(
          (employee) => employee.name.toLowerCase() === name.toLowerCase()
        );

        if (duplicate) {
          alert("That employee already exists.");
          return;
        }

        const response = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            title,
            isActive: form.isActive,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || "Failed to create employee");
        }
      }

      await loadEmployees();
      resetForm();
    } catch (error) {
      console.error("Saving employee failed:", error);
      alert(error instanceof Error ? error.message : "Failed to save employee.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(employee: Employee) {
    setEditingId(employee.id);
    setForm({
      name: employee.name,
      title: employee.title || "",
      isActive: employee.isActive,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: number) {
    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to delete employee");
      }

      await loadEmployees();

      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error("Deleting employee failed:", error);
      alert(error instanceof Error ? error.message : "Failed to delete employee.");
    }
  }

  async function toggleActive(id: number) {
    const employee = employees.find((row) => row.id === id);
    if (!employee) return;

    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: employee.name,
          title: employee.title || "",
          isActive: !employee.isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to update employee status");
      }

      await loadEmployees();

      if (editingId === id) {
        const updated = { ...employee, isActive: !employee.isActive };
        setForm({
          name: updated.name,
          title: updated.title || "",
          isActive: updated.isActive,
        });
      }
    } catch (error) {
      console.error("Toggling employee failed:", error);
      alert(error instanceof Error ? error.message : "Failed to update employee.");
    }
  }

  return (
    <main style={pageStyle}>
      <div style={layoutStyle}>
        <AppSidebar active="employees" />

        <div style={mainStyle}>
          <div style={topBarStyle}>
            <div>
              <h1 style={{ fontSize: 30, margin: 0, color: "#f5f5f5" }}>Employees</h1>
              <p style={{ color: "#d1d5db", margin: "6px 0 0 0" }}>
                Manage employee names for assignment dropdowns.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <StatCard title="All Employees" value={String(employees.length)} />
            <StatCard title="Active" value={String(activeEmployees.length)} />
            <StatCard title="Inactive" value={String(inactiveEmployees.length)} />
          </div>

          <Section
            title={editingId !== null ? "Edit Employee" : "Add Employee"}
            collapsible
            defaultOpen
          >
            <div style={{ display: "grid", gap: 16 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                <Input
                  label="Name"
                  value={form.name}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      name: value,
                    }))
                  }
                />

                <Input
                  label="Title"
                  value={form.title || ""}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      title: value,
                    }))
                  }
                />

                <div>
                  <label style={labelStyle}>Status</label>
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
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleSave}
                  style={actionButtonStyle}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                    ? "Update Employee"
                    : "Save Employee"}
                </button>

                <button type="button" onClick={resetForm} style={secondaryButtonStyle}>
                  Clear
                </button>
              </div>
            </div>
          </Section>

          <Section title="Employee List" collapsible defaultOpen>
            <div style={{ display: "grid", gap: 12 }}>
              <input
                type="text"
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={inputStyle}
              />

              {loading ? (
                <div style={emptyStateStyle}>Loading employees...</div>
              ) : filteredEmployees.length === 0 ? (
                <div style={emptyStateStyle}>No employees found.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {filteredEmployees.map((employee) => (
                    <div key={employee.id} style={cardStyle}>
                      <div style={cardHeaderStyle}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5" }}>
                            {employee.name}
                          </div>
                          <div style={{ color: "#d1d5db", fontSize: 14 }}>
                            {employee.title || "-"}
                          </div>
                        </div>

                        <div
                          style={{
                            ...statusBadgeStyle,
                            background: employee.isActive ? "#dcfce7" : "#3f3f46",
                            color: employee.isActive ? "#166534" : "#e4e4e7",
                          }}
                        >
                          {employee.isActive ? "Active" : "Inactive"}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => handleEdit(employee)}
                          style={actionButtonStyle}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleActive(employee.id)}
                          style={secondaryButtonStyle}
                        >
                          {employee.isActive ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(employee.id)}
                          style={deleteButtonStyle}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#111111",
  fontFamily: "Arial, sans-serif",
  color: "#f5f5f5",
};

const layoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "280px 1fr",
  minHeight: "100vh",
};

const mainStyle: React.CSSProperties = {
  padding: 24,
  display: "grid",
  gap: 24,
};

const topBarStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2f2f2f",
  borderRadius: 16,
  padding: 20,
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 14,
  color: "#d1d5db",
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: 8,
  border: "1px solid #3a3a3a",
  fontSize: 16,
  boxSizing: "border-box",
  background: "#121212",
  color: "#f5f5f5",
};

const actionButtonStyle: React.CSSProperties = {
  background: "#c2410c",
  color: "white",
  border: "1px solid #ea580c",
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "#2a2a2a",
  color: "white",
  border: "1px solid #3a3a3a",
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
};

const deleteButtonStyle: React.CSSProperties = {
  background: "#991b1b",
  color: "white",
  border: "1px solid #b91c1c",
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
};

const emptyStateStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2f2f2f",
  borderRadius: 14,
  padding: 18,
  color: "#a3a3a3",
};

const cardStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2f2f2f",
  borderRadius: 14,
  padding: 16,
  display: "grid",
  gap: 14,
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const statusBadgeStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};