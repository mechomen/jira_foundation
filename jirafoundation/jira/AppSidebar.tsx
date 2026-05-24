import { Link, useParams, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/lib/jira-types";
import {
  LayoutGrid, FolderKanban, Plus, ChevronRight, KanbanSquare,
  ListTodo, Map, Users,
} from "lucide-react";
import { useState } from "react";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const params = useParams({ strict: false }) as { projectKey?: string };
  const activeKey = params.projectKey;
  const [openCreate, setOpenCreate] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeProject = projects.find((p) => p.key === activeKey);

  const projTabs = activeKey ? [
    { to: `/projects/${activeKey}/board`, label: "Board", icon: KanbanSquare },
    { to: `/projects/${activeKey}/backlog`, label: "Backlog", icon: ListTodo },
    { to: `/projects/${activeKey}/roadmap`, label: "Roadmap", icon: Map },
    { to: `/projects/${activeKey}/members`, label: "Members", icon: Users },
  ] : [];

  return (
    <>
    <aside className="w-60 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-sidebar-border">
        <div className="h-7 w-7 rounded bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-sm">J</div>
        <span className="font-semibold tracking-tight">Jirah</span>
      </div>

      <nav className="px-2 py-3 space-y-0.5">
        <Link to="/projects" className={cn(
          "flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-sidebar-accent",
          pathname === "/projects" && "bg-sidebar-accent font-medium",
        )}>
          <FolderKanban className="h-4 w-4" /> Projects
        </Link>
        <Link to="/your-work" className={cn(
          "flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-sidebar-accent",
          pathname === "/your-work" && "bg-sidebar-accent font-medium",
        )}>
          <LayoutGrid className="h-4 w-4" /> Your work
        </Link>
      </nav>

      {activeProject && (
        <div className="px-2 mt-2">
          <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-sidebar-foreground/60 font-semibold">
            Current project
          </div>
          <div className="px-3 py-2 flex items-center gap-2 rounded bg-sidebar-accent/40">
            <div className="h-6 w-6 rounded bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-[10px] font-bold">
              {activeProject.key.slice(0,2)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{activeProject.name}</div>
              <div className="text-[11px] text-sidebar-foreground/60">{activeProject.key}</div>
            </div>
          </div>
          <div className="mt-1 space-y-0.5">
            {projTabs.map((t) => (
              <Link key={t.to} to={t.to} className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded text-sm hover:bg-sidebar-accent",
                pathname === t.to && "bg-sidebar-accent font-medium",
              )}>
                <t.icon className="h-4 w-4" /> {t.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="px-2 mt-4">
        <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-sidebar-foreground/60 font-semibold flex items-center justify-between">
          <span>All projects</span>
          <button onClick={() => setOpenCreate(true)} className="hover:text-sidebar-foreground" aria-label="New project">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-0.5 max-h-64 overflow-auto">
          {projects.map((p) => (
            <Link key={p.id} to={`/projects/${p.key}/board`} className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded text-sm hover:bg-sidebar-accent",
              activeKey === p.key && "bg-sidebar-accent",
            )}>
              <ChevronRight className="h-3 w-3 opacity-60" />
              <span className="truncate">{p.name}</span>
            </Link>
          ))}
          {projects.length === 0 && (
            <div className="px-3 py-2 text-xs text-sidebar-foreground/50">No projects yet</div>
          )}
        </div>
      </div>

      <div className="mt-auto p-3 text-[11px] text-sidebar-foreground/40">
        Jirah · Agile workspace
      </div>
    </aside>
    <CreateProjectDialog open={openCreate} onOpenChange={setOpenCreate} />
    </>
  );
}
