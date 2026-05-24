export type IssueType = "story" | "task" | "bug" | "epic";
export type IssueStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";
export type IssuePriority = "lowest" | "low" | "medium" | "high" | "highest";
export type SprintStatus = "planned" | "active" | "completed";
export type MemberRole = "lead" | "admin" | "member" | "viewer";

export interface Project {
  id: string;
  key: string;
  name: string;
  description: string | null;
  lead_id: string;
  created_at: string;
}

export interface Issue {
  id: string;
  project_id: string;
  sprint_id: string | null;
  key: string;
  title: string;
  description: string | null;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  assignee_id: string | null;
  reporter_id: string;
  story_points: number | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: MemberRole;
}

export const STATUS_COLUMNS: { id: IssueStatus; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "in_review", label: "In Review" },
  { id: "done", label: "Done" },
];

export const TYPE_LABEL: Record<IssueType, string> = {
  story: "Story", task: "Task", bug: "Bug", epic: "Epic",
};

export const PRIORITY_LABEL: Record<IssuePriority, string> = {
  lowest: "Lowest", low: "Low", medium: "Medium", high: "High", highest: "Highest",
};
