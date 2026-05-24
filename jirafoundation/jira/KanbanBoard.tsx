import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Issue, IssueStatus, Profile, Sprint } from "@/lib/jira-types";
import { STATUS_COLUMNS } from "@/lib/jira-types";
import { IssueTypeIcon, PriorityIcon } from "./IssueChips";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreateIssueDialog } from "./CreateIssueDialog";
import { IssueDetailDialog } from "./IssueDetailDialog";
import { toast } from "sonner";

interface Props {
  projectId: string;
  projectKey: string;
  issues: Issue[];
  members: Profile[];
  sprints: Sprint[];
  sprintFilter?: string | "all";
}

export function KanbanBoard({ projectId, projectKey, issues, members, sprints, sprintFilter = "all" }: Props) {
  const qc = useQueryClient();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<IssueStatus | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<IssueStatus>("todo");
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);

  const filtered = issues.filter((i) => {
    if (i.status === "backlog") return false;
    if (sprintFilter === "all") return true;
    return i.sprint_id === sprintFilter;
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: IssueStatus }) => {
      const { error } = await supabase.from("issues").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["issues", projectId] });
      const prev = qc.getQueryData<Issue[]>(["issues", projectId]);
      qc.setQueryData<Issue[]>(["issues", projectId], (old) =>
        (old ?? []).map((i) => (i.id === id ? { ...i, status } : i)));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["issues", projectId], ctx.prev);
      toast.error("Failed to move issue");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["issues", projectId] }),
  });

  const memberById = new Map(members.map((m) => [m.id, m]));

  return (
    <>
    <div className="p-6 flex gap-4 min-w-max">
      {STATUS_COLUMNS.map((col) => {
        const colIssues = filtered.filter((i) => i.status === col.id);
        return (
          <div
            key={col.id}
            onDragOver={(e) => { e.preventDefault(); setOverCol(col.id); }}
            onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
            onDrop={() => {
              if (draggingId) updateStatus.mutate({ id: draggingId, status: col.id });
              setDraggingId(null); setOverCol(null);
            }}
            className={cn(
              "w-72 shrink-0 bg-surface rounded-md p-2 flex flex-col max-h-full",
              overCol === col.id && "ring-2 ring-primary",
            )}
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{col.label}</span>
                <span className="text-xs text-muted-foreground bg-background rounded px-1.5">{colIssues.length}</span>
              </div>
            </div>
            <div className="flex-1 overflow-auto space-y-2 p-1">
              {colIssues.map((i) => {
                const assignee = i.assignee_id ? memberById.get(i.assignee_id) : null;
                const initials = (assignee?.display_name || assignee?.email || "?").slice(0,2).toUpperCase();
                return (
                  <button
                    key={i.id}
                    draggable
                    onDragStart={() => setDraggingId(i.id)}
                    onDragEnd={() => { setDraggingId(null); setOverCol(null); }}
                    onClick={() => setOpenIssueId(i.id)}
                    className={cn(
                      "w-full text-left bg-background rounded shadow-sm hover:shadow-md transition-shadow p-3 cursor-grab active:cursor-grabbing border",
                      draggingId === i.id && "opacity-50",
                    )}
                  >
                    <div className="text-sm font-medium mb-2 line-clamp-3">{i.title}</div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <IssueTypeIcon type={i.type} />
                        <span className="text-xs font-mono text-muted-foreground truncate">{i.key}</span>
                        <PriorityIcon priority={i.priority} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {i.story_points != null && (
                          <span className="h-5 min-w-5 px-1 rounded-full bg-muted text-[10px] font-semibold flex items-center justify-center">{i.story_points}</span>
                        )}
                        {assignee ? (
                          <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-primary text-primary-foreground">{initials}</AvatarFallback></Avatar>
                        ) : (
                          <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-muted text-muted-foreground">?</AvatarFallback></Avatar>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <Button variant="ghost" size="sm" className="justify-start text-muted-foreground"
              onClick={() => { setCreateStatus(col.id); setCreateOpen(true); }}>
              <Plus className="h-4 w-4" /> Create
            </Button>
          </div>
        );
      })}
    </div>
    <CreateIssueDialog
      open={createOpen} onOpenChange={setCreateOpen}
      projectId={projectId} members={members} sprints={sprints}
      defaultStatus={createStatus}
    />
    <IssueDetailDialog
      issueId={openIssueId} onOpenChange={(v) => !v && setOpenIssueId(null)}
      projectId={projectId} members={members} sprints={sprints}
    />
    </>
  );
}
