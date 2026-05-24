import type { IssuePriority, IssueStatus, IssueType } from "@/lib/jira-types";
import { Bookmark, Bug, CheckSquare, Zap, ChevronUp, ChevronsUp, Minus, ChevronDown, ChevronsDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function IssueTypeIcon({ type, className }: { type: IssueType; className?: string }) {
  const map = {
    story: { Icon: Bookmark, color: "text-type-story bg-type-story/10" },
    task: { Icon: CheckSquare, color: "text-type-task bg-type-task/10" },
    bug: { Icon: Bug, color: "text-type-bug bg-type-bug/10" },
    epic: { Icon: Zap, color: "text-type-epic bg-type-epic/10" },
  } as const;
  const { Icon, color } = map[type];
  return (
    <span className={cn("inline-flex items-center justify-center h-5 w-5 rounded-sm", color, className)}>
      <Icon className="h-3 w-3" />
    </span>
  );
}

export function PriorityIcon({ priority }: { priority: IssuePriority }) {
  const map = {
    highest: { Icon: ChevronsUp, color: "text-destructive" },
    high: { Icon: ChevronUp, color: "text-destructive/80" },
    medium: { Icon: Minus, color: "text-status-review" },
    low: { Icon: ChevronDown, color: "text-primary/70" },
    lowest: { Icon: ChevronsDown, color: "text-muted-foreground" },
  } as const;
  const { Icon, color } = map[priority];
  return <Icon className={cn("h-4 w-4", color)} aria-label={priority} />;
}

export function StatusBadge({ status }: { status: IssueStatus }) {
  const map: Record<IssueStatus, { label: string; cls: string }> = {
    backlog: { label: "Backlog", cls: "bg-muted text-muted-foreground" },
    todo: { label: "To Do", cls: "bg-muted text-foreground" },
    in_progress: { label: "In Progress", cls: "bg-primary/15 text-primary" },
    in_review: { label: "In Review", cls: "bg-status-review/15 text-status-review" },
    done: { label: "Done", cls: "bg-status-done/15 text-status-done" },
  };
  const { label, cls } = map[status];
  return <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded", cls)}>{label}</span>;
}
