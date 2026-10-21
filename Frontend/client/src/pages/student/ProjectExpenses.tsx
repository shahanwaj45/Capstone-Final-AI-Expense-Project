import { useEffect, useState } from "react";
import { BriefcaseBusiness, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import FeaturePageHeader from "@/components/dashboard/FeaturePageHeader";
import { studentNav } from "@/data/studentData";
import api from "@/lib/api";

export default function ProjectExpenses() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get("/projects");
      if (res.data.success) {
        setProjects(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async () => {
    const name = prompt("Enter new project title (e.g., IoT Capstone, Robotics Kit):");
    if (!name || !name.trim()) return;
    const budgetStr = prompt("Enter allocated project budget (₹):", "10000");
    if (!budgetStr) return;
    const budget = parseFloat(budgetStr);
    if (isNaN(budget) || budget <= 0) {
      toast.error("Invalid budget amount entered");
      return;
    }

    try {
      await api.post("/projects", { name: name.trim(), budget });
      toast.success(`Project "${name}" created!`);
      fetchProjects();
    } catch {
      toast.error("Failed to create project");
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete project "${name}"?`)) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success(`Project "${name}" deleted`);
      fetchProjects();
    } catch {
      toast.error("Failed to delete project");
    }
  };

  const handleAddExpense = async (projectId: string, projectName: string) => {
    const amountStr = prompt(`Enter expense amount for ${projectName} (₹):`);
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount entered");
      return;
    }
    const name = prompt("Enter expense description (e.g., Sensors, Books):") || "Project Expense";

    try {
      await api.post(`/projects/${projectId}/expenses`, { name, amount });
      toast.success(`Expense of ₹${amount} added to ${projectName}`);
      fetchProjects();
    } catch (err) {
      toast.error("Failed to add project expense");
    }
  };

  return (
    <DashboardLayout role="student" navItems={studentNav} pageTitle="Project Expenses">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <FeaturePageHeader
          role="student"
          title="Project Expenses"
          description="Separate and manage project-specific costs. Keep your academic spending organised and transparent."
          icon={BriefcaseBusiness}
          accentColor="#f6ae8e"
          accentBg="#fff5ef"
        />
        <button
          onClick={handleCreateProject}
          className="flex items-center gap-1.5 rounded-2xl bg-[#172532] px-4 py-2.5 text-[12px] font-bold text-white shadow-sm hover:bg-[#25394b] transition active:scale-95 self-start sm:self-auto"
        >
          <Plus size={15} /> New Project
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#f6ae8e] border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((p) => {
            const pct = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
            return (
              <div key={p.id || p.name} className="rounded-[22px] bg-white p-6 shadow-[6px_9px_23px_rgba(42,65,55,.07)]">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-display text-[18px] font-bold tracking-[-.04em]">{p.name}</h4>
                    <p className="mt-1 text-[11px] text-[#9ba59f]">{p.items ?? p.expenses_count ?? 0} expense items</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleAddExpense(p.id, p.name)}
                      className="rounded-xl bg-[#f5f8f4] px-3 py-2 text-[11px] font-bold text-[#718078] hover:bg-[#e8ede7] transition"
                    >
                      <Plus size={14} className="mr-1 inline" /> Add
                    </button>
                    <button
                      onClick={() => handleDeleteProject(p.id, p.name)}
                      className="rounded-xl p-2 text-[#b0beba] hover:text-[#d9534f] hover:bg-[#fdedeb] transition"
                      title="Delete project"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <p className="font-display text-[26px] font-bold tracking-[-.05em]">
                    ₹{(p.spent || 0).toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] font-bold text-[#9ba59f]">{pct}% of budget</p>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[#f3e5dc]">
                  <div className="h-full rounded-full bg-[#f6ae8e]" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <p className="mt-1 text-right text-[10px] text-[#b59d8d]">
                  ₹{Math.max(0, (p.budget || 0) - (p.spent || 0)).toLocaleString("en-IN")} remaining
                </p>
              </div>
            );
          })}
          {projects.length === 0 && (
            <div className="rounded-[22px] bg-[#f9fbf8] p-8 text-center text-[#82908a]">
              No academic projects added yet.
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
