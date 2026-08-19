import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { authFetch } from "@/lib/auth-client";
import { protocolCreateSchema, type ProtocolCreate } from "@/lib/admin-schemas";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/protocols")({
  head: () => ({
    meta: [{ title: "Protocols — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: ProtocolsAdmin,
});

type ProtocolRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  body: string;
  source: string;
  is_disaster: boolean;
  created_at: string;
};

function ProtocolsAdmin() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<ProtocolRow | null>(null);
  const [deletingProtocol, setDeletingProtocol] = useState<ProtocolRow | null>(null);

  const {
    data: protocols,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-protocols"],
    queryFn: async (): Promise<ProtocolRow[]> => {
      const res = await fetch("/api/public/protocols");
      if (!res.ok) throw new Error(`protocols fetch failed: ${res.status}`);
      return (await res.json()).protocols ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: ProtocolCreate) => {
      const res = await authFetch("/api/admin/protocols", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to create protocol");
      return body.protocol;
    },
    onSuccess: () => {
      toast.success("Protocol created");
      qc.invalidateQueries({ queryKey: ["admin-protocols"] });
      setCreating(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Omit<ProtocolCreate, "slug"> }) => {
      const res = await authFetch(`/api/admin/protocols/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to update protocol");
      return body.protocol;
    },
    onSuccess: () => {
      toast.success("Protocol updated");
      qc.invalidateQueries({ queryKey: ["admin-protocols"] });
      setEditingProtocol(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await authFetch(`/api/admin/protocols/${id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to delete protocol");
      return body;
    },
    onSuccess: () => {
      toast.success("Protocol deleted");
      qc.invalidateQueries({ queryKey: ["admin-protocols"] });
      setDeletingProtocol(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Protocols</h1>
          <p className="text-sm text-muted-foreground">
            {protocols?.length ?? 0} protocols · dosing and diagnosis text, lookup-table only —
            never generated
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>New protocol</Button>
      </header>

      {isError && (
        <div
          className="mb-4 border-2 px-3 py-2 text-sm"
          style={{
            borderColor: "var(--color-watch)",
            background: "var(--color-watch-soft)",
            color: "var(--color-on-watch)",
          }}
        >
          Couldn't load protocols. Showing whatever loaded previously, if anything.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs uppercase text-muted-foreground">Title</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Category</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Disaster</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Source</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Slug</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Body</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Created</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {isLoading && (
              <TableRow className="border-border">
                <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && (protocols ?? []).length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                  No protocols yet.
                </TableCell>
              </TableRow>
            )}
            {(protocols ?? []).map((p) => (
              <TableRow key={p.id} className="border-border hover:bg-secondary/40">
                <TableCell className="font-semibold text-foreground">{p.title}</TableCell>
                <TableCell className="text-muted-foreground">{p.category}</TableCell>
                <TableCell>
                  {p.is_disaster ? (
                    <span className="inline-flex w-fit rounded bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-accent-ink)]">
                      Disaster
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="max-w-[16rem] text-xs text-muted-foreground">
                  {p.source}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{p.slug}</TableCell>
                <TableCell className="max-w-md text-xs text-foreground">
                  <details>
                    <summary className="cursor-pointer text-primary">
                      {p.body.length > 80 ? `${p.body.slice(0, 80)}…` : p.body}
                    </summary>
                    <p className="mt-1 whitespace-pre-line">{p.body}</p>
                  </details>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingProtocol(p)}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeletingProtocol(p)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {creating && (
        <ProtocolFormDialog
          mode="create"
          onOpenChange={(open) => !open && setCreating(false)}
          onSubmit={(values) => createMutation.mutate(values as ProtocolCreate)}
          isPending={createMutation.isPending}
        />
      )}

      {editingProtocol && (
        <ProtocolFormDialog
          mode="edit"
          protocol={editingProtocol}
          onOpenChange={(open) => !open && setEditingProtocol(null)}
          onSubmit={(values) => updateMutation.mutate({ id: editingProtocol.id, values })}
          isPending={updateMutation.isPending}
        />
      )}

      <AlertDialog
        open={deletingProtocol !== null}
        onOpenChange={(open) => !open && setDeletingProtocol(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deletingProtocol ? `Delete "${deletingProtocol.title}"?` : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone and removes the protocol entirely, including from the CHW app's
              lookup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <DeleteReasonField
            onConfirm={(reason) => {
              if (deletingProtocol) deleteMutation.mutate({ id: deletingProtocol.id, reason });
            }}
            isPending={deleteMutation.isPending}
          />
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function DeleteReasonField({
  onConfirm,
  isPending,
}: {
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="protocol-delete-reason">Reason (required)</Label>
        <Input
          id="protocol-delete-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this protocol being deleted?"
        />
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          disabled={reason.trim().length === 0 || isPending}
          onClick={() => onConfirm(reason.trim())}
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}

/** Issue #13, hard product constraint: dosing/diagnosis text must be transcribed
 *  from a cited source and never generated. This banner is deliberately static —
 *  no dismiss button, no "don't show again" state, no localStorage. There is also
 *  deliberately no "improve wording" / AI-assist affordance anywhere in this form,
 *  and there must never be one added later, per CLAUDE.md's protocol rule. */
function NoAiAssistBanner() {
  return (
    <div
      className="border-2 px-3 py-2 text-sm font-medium"
      style={{
        borderColor: "var(--color-critical)",
        background: "var(--color-critical-soft)",
        color: "var(--color-on-critical)",
      }}
    >
      Dosing and diagnosis text must be transcribed word-for-word from the cited source. Never
      paraphrase, summarize, or generate this content — including with AI assistance.
    </div>
  );
}

function ProtocolFormDialog({
  mode,
  protocol,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  mode: "create" | "edit";
  protocol?: ProtocolRow;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProtocolCreate | Omit<ProtocolCreate, "slug">) => void;
  isPending: boolean;
}) {
  // ONE stable schema for both modes (slug made optional rather than switching
  // between two structurally different schemas) -- documented pitfall from
  // LakeFormDialog: a ternary between two zod schemas doesn't reconcile into one
  // stable react-hook-form generic, even with casts on the resolver alone. Cast
  // happens only at the handleSubmit callback boundary below.
  const schema = protocolCreateSchema.partial({ slug: true });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues:
      mode === "edit" && protocol
        ? {
            slug: undefined,
            title: protocol.title,
            category: protocol.category,
            body: protocol.body,
            source: protocol.source,
            is_disaster: protocol.is_disaster,
          }
        : { slug: "", title: "", category: "", body: "", source: "", is_disaster: false },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New protocol" : "Edit protocol"}</DialogTitle>
        </DialogHeader>

        <NoAiAssistBanner />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => onSubmit(values as ProtocolCreate))}
            className="space-y-4"
          >
            {mode === "create" && (
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. hypothermia-mild" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body (transcribed verbatim from source)</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={8} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source (required)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="e.g. WHO Pocket Book of Hospital Care for Children, 2nd ed., p. 234"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_disaster"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4">
                  <FormLabel>Disaster protocol</FormLabel>
                  <FormControl>
                    <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {mode === "create" ? "Create protocol" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
