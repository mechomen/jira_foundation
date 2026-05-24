import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Issue, IssuePriority, IssueStatus, IssueType, Profile, Sprint } from "@/lib/jira-types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { IssueTypeIcon } from "./IssueChips";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Comment { id: string; body: string; created_at: string; author_id: string; }

interface Props {
  issueId: string | null;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  members: Profile[];
  sprints: Sprint[];
}

export function IssueDetailDialog({ issueId, onOpenChange, projectId, members, sprints }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const open = !!issueId;

  const { data: issue } = useQuery({
    queryKey: ["issue", issueId],
    enabled: !!issueId,
    queryFn: async (): Promise<Issue | null> => {
      const { data, error } = await supabase.from("issues").select("*").eq("id", issueId!).maybeSingle();
      if (error) throw error;
      return data as Issue | null;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", issueId],
    enabled: !!issueId,
    queryFn: async (): Promise<Comment[]> => {
      const { data, error } = await supabase.from("comments").select("*").eq("issue_id", issueId!).order("created_at");
      if (error) throw error;
      return (data ?? []) as Comment[];
    },
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editTitle, setEditTitle] = useState(false);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (issue) { setTitle(issue.title); setDescription(issue.description ?? ""); }
  }, [issue]);

  const update = useMutation({
    mutationFn: async (patch: Partial<Issue>) => {
      const { error } = await supabase.from("issues").update(patch).eq("id", issueId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issue", issueId] });
      qc.invalidateQueries({ queryKey: ["issues", projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("issues").delete().eq("id", issueId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Issue deleted");
      qc.invalidateQueries({ queryKey: ["issues", projectId] });
      onOpenChange(false);
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("comments").insert({
        issue_id: issueId!, author_id: user.id, body: comment,
      });
      if (error) throw error;
    },
    onSuccess: () => { setComment(""); qc.invalidateQueries({ queryKey: ["comments", issueId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!issue) return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent><div className="p-6 text-sm text-muted-foreground">Loading…</div></DialogContent>
    </Dialog>
  );

  const memberById = new Map(members.map((m) => [m.id, m]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-4 pb-2 border-b">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IssueTypeIcon type={issue.type} />
            <span className="font-mono">{issue.key}</span>
          </div>
          <DialogTitle className="sr-only">{issue.title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 max-h-[80vh]">
          <div className="md:col-span-2 p-6 overflow-auto space-y-5">
            {editTitle ? (
              <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
                onBlur={() => { setEditTitle(false); if (title !== issue.title) update.mutate({ title }); }}
                className="text-xl font-semibold h-auto py-1" />
            ) : (
              <h2 className="text-xl font-semibold tracking-tight cursor-text hover:bg-surface rounded px-2 -mx-2 py-1"
                onClick={() => setEditTitle(true)}>{issue.title}</h2>
            )}
            <div>
              <div className="text-sm font-semibold mb-2">Description</div>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                onBlur={() => { if (description !== (issue.description ?? "")) update.mutate({ description: description || null }); }}
                placeholder="Add a description…" rows={5} />
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">Activity · Comments</div>
              <div className="flex gap-2 mb-3">
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" rows={2} />
                <Button onClick={() => comment.trim() && addComment.mutate()} disabled={!comment.trim() || addComment.isPending}>Comment</Button>
              </div>
              <div className="space-y-3">
                {comments.map((c) => {
                  const a = memberById.get(c.author_id);
                  const initials = (a?.display_name || a?.email || "?").slice(0,2).toUpperCase();
                  return (
                    <div key={c.id} className="flex gap-3">
                      <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px] bg-primary text-primary-foreground">{initials}</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <div className="text-xs">
                          <span className="font-medium">{a?.display_name || a?.email || "Unknown"}</span>
                          <span className="text-muted-foreground"> · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                        </div>
                        <div className="text-sm mt-0.5 whitespace-pre-wrap">{c.body}</div>
                      </div>
                    </div>
                  );
                })}
                {comments.length === 0 && <div className="text-xs text-muted-foreground">No comments yet.</div>}
              </div>
            </div>
          </div>
          <div className="bg-surface p-6 space-y-4 overflow-auto border-l">
            <Field label="Status">
              <Select value={issue.status} onValueChange={(v) => update.mutate({ status: v as IssueStatus })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Assignee">
              <Select value={issue.assignee_id ?? "__none"} onValueChange={(v) => update.mutate({ assignee_id: v === "__none" ? null : v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Unassigned</SelectItem>
                  {members.map((mem) => (
                    <SelectItem key={mem.id} value={mem.id}>{mem.display_name || mem.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Type">
              <Select value={issue.type} onValueChange={(v) => update.mutate({ type: v as IssueType })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={issue.priority} onValueChange={(v) => update.mutate({ priority: v as IssuePriority })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="highest">Highest</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="lowest">Lowest</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sprint">
              <Select value={issue.sprint_id ?? "__none"} onValueChange={(v) => update.mutate({ sprint_id: v === "__none" ? null : v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Backlog</SelectItem>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Story points">
              <Input type="number" min={0} defaultValue={issue.story_points ?? ""}
                onBlur={(e) => {
                  const v = e.target.value === "" ? null : parseInt(e.target.value);
                  if (v !== issue.story_points) update.mutate({ story_points: v });
                }} className="bg-background" />
            </Field>
            <div className="pt-3 border-t">
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                onClick={() => { if (confirm("Delete this issue?")) del.mutate(); }}>
                <Trash2 className="h-4 w-4" /> Delete issue
              </Button>
            </div>
            <div className="text-[11px] text-muted-foreground pt-2">
              Created {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}
