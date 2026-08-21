import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { authFetch } from "@/lib/auth-client";
import { chwProfileCreateSchema, type ChwProfileCreate } from "@/lib/admin-schemas";
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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

export const Route = createFileRoute("/admin/chw-profiles")({
  head: () => ({
    meta: [{ title: "CHW profiles — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: ChwProfilesAdmin,
});

type ChwProfileRow = {
  id: string;
  user_id: string | null;
  full_name: string;
  district_id: string | null;
  phone: string | null;
  language: string;
  created_at: string;
  district_name: string | null;
  user_name: string | null;
  user_lhw_id: string | null;
  active: boolean | null;
};

type DistrictRow = { id: string; name: string };

function ChwProfilesAdmin() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ChwProfileRow | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<ChwProfileRow | null>(null);

  const {
    data: profiles,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-chw-profiles"],
    queryFn: async (): Promise<ChwProfileRow[]> => {
      const res = await fetch("/api/public/chw-profiles");
      if (!res.ok) throw new Error(`chw-profiles fetch failed: ${res.status}`);
      return (await res.json()).profiles ?? [];
    },
  });

  const { data: districts } = useQuery({
    queryKey: ["admin-districts"],
    queryFn: async (): Promise<DistrictRow[]> => {
      const res = await fetch("/api/public/districts");
      if (!res.ok) throw new Error(`districts fetch failed: ${res.status}`);
      return (await res.json()).districts ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: ChwProfileCreate) => {
      const res = await authFetch("/api/admin/chw-profiles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to create CHW profile");
      return body.profile;
    },
    onSuccess: () => {
      toast.success("CHW profile created");
      qc.invalidateQueries({ queryKey: ["admin-chw-profiles"] });
      setCreating(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ChwProfileCreate }) => {
      const res = await authFetch(`/api/admin/chw-profiles/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to update CHW profile");
      return body.profile;
    },
    onSuccess: () => {
      toast.success("CHW profile updated");
      qc.invalidateQueries({ queryKey: ["admin-chw-profiles"] });
      setEditingProfile(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await authFetch(`/api/admin/chw-profiles/${id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to delete CHW profile");
      return body;
    },
    onSuccess: () => {
      toast.success("CHW profile deleted");
      qc.invalidateQueries({ queryKey: ["admin-chw-profiles"] });
      setDeletingProfile(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">CHW profiles</h1>
          <p className="text-sm text-muted-foreground">{profiles?.length ?? 0} profiles</p>
        </div>
        <Button onClick={() => setCreating(true)}>New profile</Button>
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
          Couldn't load CHW profiles. Showing whatever loaded previously, if anything.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs uppercase text-muted-foreground">Name</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">District</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Phone</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Language</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">User</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Active</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Added</TableHead>
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
            {!isLoading && !isError && (profiles ?? []).length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  No CHW profiles yet.
                </TableCell>
              </TableRow>
            )}
            {(profiles ?? []).map((p) => (
              <TableRow key={p.id} className="border-border hover:bg-secondary/40">
                <TableCell className="font-semibold text-foreground">{p.full_name}</TableCell>
                <TableCell className="text-muted-foreground">{p.district_name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{p.phone ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{p.language}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.user_name ?? p.user_lhw_id ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.active == null ? "—" : p.active ? "Yes" : "No"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingProfile(p)}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeletingProfile(p)}>
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
        <ChwProfileFormDialog
          districts={districts ?? []}
          onOpenChange={(open) => !open && setCreating(false)}
          onSubmit={(values) => createMutation.mutate(values)}
          isPending={createMutation.isPending}
        />
      )}

      {editingProfile && (
        <ChwProfileFormDialog
          profile={editingProfile}
          districts={districts ?? []}
          onOpenChange={(open) => !open && setEditingProfile(null)}
          onSubmit={(values) => updateMutation.mutate({ id: editingProfile.id, values })}
          isPending={updateMutation.isPending}
        />
      )}

      <AlertDialog
        open={deletingProfile !== null}
        onOpenChange={(open) => !open && setDeletingProfile(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deletingProfile ? `Delete "${deletingProfile.full_name}"?` : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <DeleteReasonField
            onConfirm={(reason) => {
              if (deletingProfile) deleteMutation.mutate({ id: deletingProfile.id, reason });
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
        <Label htmlFor="chw-profile-delete-reason">Reason (required)</Label>
        <Input
          id="chw-profile-delete-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this profile being deleted?"
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

function ChwProfileFormDialog({
  profile,
  districts,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  profile?: ChwProfileRow;
  districts: DistrictRow[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ChwProfileCreate) => void;
  isPending: boolean;
}) {
  const form = useForm<ChwProfileCreate>({
    resolver: zodResolver(chwProfileCreateSchema),
    defaultValues: profile
      ? {
          full_name: profile.full_name,
          district_id: profile.district_id,
          phone: profile.phone,
          language: profile.language,
        }
      : { full_name: "", district_id: null, phone: "", language: "" },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{profile ? "Edit CHW profile" : "New CHW profile"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="district_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>District (optional)</FormLabel>
                  <Select value={field.value ?? undefined} onValueChange={(v) => field.onChange(v)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No district" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {districts.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? null : e.target.value)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="e.g. ur" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {profile ? "Save changes" : "Create profile"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
