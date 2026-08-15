import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { authFetch } from "@/lib/auth-client";
import { districtCreateSchema, type DistrictCreate } from "@/lib/admin-schemas";
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
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/districts")({
  head: () => ({
    meta: [{ title: "Districts — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: DistrictsAdmin,
});

type DistrictRow = {
  id: string;
  name: string;
  province: string;
  population: number | null;
};

type DialogState = { mode: "create" } | { mode: "edit"; district: DistrictRow } | null;

function dependentsMessage(dependents: Record<string, number>): string {
  const parts = Object.entries(dependents)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${k}`)
    .join(", ");
  return `Cannot delete: still referenced by ${parts}.`;
}

function DistrictsAdmin() {
  const qc = useQueryClient();
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [deletingDistrict, setDeletingDistrict] = useState<DistrictRow | null>(null);

  const {
    data: districts,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-districts"],
    queryFn: async (): Promise<DistrictRow[]> => {
      const res = await fetch("/api/public/districts");
      if (!res.ok) throw new Error(`districts fetch failed: ${res.status}`);
      return (await res.json()).districts ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: DistrictCreate) => {
      const res = await authFetch("/api/admin/districts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to create district");
      return body.district;
    },
    onSuccess: () => {
      toast.success("District created");
      qc.invalidateQueries({ queryKey: ["admin-districts"] });
      setDialogState(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: DistrictCreate }) => {
      const res = await authFetch(`/api/admin/districts/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to update district");
      return body.district;
    },
    onSuccess: () => {
      toast.success("District updated");
      qc.invalidateQueries({ queryKey: ["admin-districts"] });
      setDialogState(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await authFetch(`/api/admin/districts/${id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(
          body.dependents
            ? dependentsMessage(body.dependents)
            : (body.error ?? "Failed to delete district"),
        );
      }
      return body;
    },
    onSuccess: () => {
      toast.success("District deleted");
      qc.invalidateQueries({ queryKey: ["admin-districts"] });
      setDeletingDistrict(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Districts</h1>
          <p className="text-sm text-muted-foreground">{districts?.length ?? 0} districts</p>
        </div>
        <Button onClick={() => setDialogState({ mode: "create" })}>New district</Button>
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
          Couldn't load districts. Showing whatever loaded previously, if anything.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs uppercase text-muted-foreground">Name</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Province</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {isLoading && (
              <TableRow className="border-border">
                <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && (districts ?? []).length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                  No districts yet.
                </TableCell>
              </TableRow>
            )}
            {(districts ?? []).map((d) => (
              <TableRow key={d.id} className="border-border hover:bg-secondary/40">
                <TableCell className="font-semibold text-foreground">{d.name}</TableCell>
                <TableCell className="text-muted-foreground">{d.province}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDialogState({ mode: "edit", district: d })}
                    >
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeletingDistrict(d)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {dialogState && (
        <DistrictFormDialog
          key={dialogState.mode === "edit" ? dialogState.district.id : "create"}
          initial={dialogState.mode === "edit" ? dialogState.district : null}
          onOpenChange={(open) => !open && setDialogState(null)}
          onSubmit={(values) => {
            if (dialogState.mode === "edit") {
              updateMutation.mutate({ id: dialogState.district.id, values });
            } else {
              createMutation.mutate(values);
            }
          }}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <DeleteDistrictDialog
        district={deletingDistrict}
        onOpenChange={(open) => !open && setDeletingDistrict(null)}
        onConfirm={(reason) => {
          if (deletingDistrict) deleteMutation.mutate({ id: deletingDistrict.id, reason });
        }}
        isPending={deleteMutation.isPending}
      />
    </main>
  );
}

function DistrictFormDialog({
  initial,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  initial: DistrictRow | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: DistrictCreate) => void;
  isPending: boolean;
}) {
  const form = useForm<DistrictCreate>({
    resolver: zodResolver(districtCreateSchema),
    defaultValues: {
      name: initial?.name ?? "",
      province: initial?.province ?? "Gilgit Baltistan",
      population: initial?.population ?? undefined,
    },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit district" : "New district"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="province"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Province</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="population"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Population (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? null : Number(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {initial ? "Save changes" : "Create district"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDistrictDialog({
  district,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  district: DistrictRow | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (district) setReason("");
  }, [district]);

  return (
    <AlertDialog open={district !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{district?.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone. If any alerts, cases, CHW profiles, glaciers or lakes still
            reference this district, the delete will be blocked instead of silently orphaning them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="district-delete-reason">Reason (required)</Label>
          <Input
            id="district-delete-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this district being deleted?"
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
      </AlertDialogContent>
    </AlertDialog>
  );
}
