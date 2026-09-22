import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { fetchFacilitiesAdmin, adminRequest } from "@/lib/cryohealth-client";
import { facilityCreateSchema, type FacilityCreate } from "@/lib/admin-schemas";
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

export const Route = createFileRoute("/admin/facilities")({
  head: () => ({
    meta: [{ title: "Facilities — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: FacilitiesAdmin,
});

type FacilityRow = {
  id: string;
  name: string;
  type: string;
  district: string;
  vulnerability: string;
  contact: string | null;
  lat: number | null;
  lng: number | null;
  has_geom: boolean;
  lake_id: string | null;
  created_at: string;
};

function FacilitiesAdmin() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editingFacility, setEditingFacility] = useState<FacilityRow | null>(null);
  const [deletingFacility, setDeletingFacility] = useState<FacilityRow | null>(null);

  const {
    data: facilitiesResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-facilities"],
    queryFn: async (): Promise<{ facilities: FacilityRow[]; total: number; hasMore: boolean }> => {
      const { facilities, total, hasMore } = await fetchFacilitiesAdmin();
      return { facilities: facilities as FacilityRow[], total, hasMore };
    },
  });

  const facilities = facilitiesResponse?.facilities ?? [];
  const facilitiesTotal = facilitiesResponse?.total ?? 0;
  const facilitiesHasMore = facilitiesResponse?.hasMore ?? false;

  const createMutation = useMutation({
    mutationFn: async (values: FacilityCreate) => {
      const result = await adminRequest("/admin/facilities", {
        method: "POST",
        body: JSON.stringify(values),
      });
      if (!result.ok) throw new Error(result.body.error ?? "Failed to create facility");
      return result.body;
    },
    onSuccess: () => {
      toast.success("Facility created");
      qc.invalidateQueries({ queryKey: ["admin-facilities"] });
      setCreating(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: FacilityCreate }) => {
      const result = await adminRequest(`/admin/facilities/${id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      });
      if (!result.ok) throw new Error(result.body.error ?? "Failed to update facility");
      return result.body;
    },
    onSuccess: () => {
      toast.success("Facility updated");
      qc.invalidateQueries({ queryKey: ["admin-facilities"] });
      setEditingFacility(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const result = await adminRequest(
        `/admin/facilities/${id}?reason=${encodeURIComponent(reason)}`,
        {
          method: "DELETE",
        },
      );
      if (!result.ok) throw new Error(result.body.error ?? "Failed to delete facility");
      return result.body;
    },
    onSuccess: () => {
      toast.success("Facility deleted");
      qc.invalidateQueries({ queryKey: ["admin-facilities"] });
      setDeletingFacility(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unmappedCount = (facilities ?? []).filter((f) => !f.has_geom).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Facilities</h1>
          <p className="text-sm text-muted-foreground">
            {facilitiesHasMore
              ? `Showing the latest ${facilities.length} of ${facilitiesTotal.toLocaleString()} facilities`
              : `${facilitiesTotal.toLocaleString()} facilities`}
            {unmappedCount > 0
              ? ` · ${unmappedCount} with no mapped location (hidden from the hazard map)`
              : ""}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>New facility</Button>
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
          Couldn't load facilities. Showing whatever loaded previously, if anything.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs uppercase text-muted-foreground">Name</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Type</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">District</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">
                Vulnerability
              </TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Mapped</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Lat / Lng</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Contact</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Added</TableHead>
              <TableHead className="text-right text-xs uppercase text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {isLoading && (
              <TableRow className="border-border">
                <TableCell colSpan={9} className="py-6 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && (facilities ?? []).length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={9} className="py-6 text-center text-muted-foreground">
                  No facilities yet.
                </TableCell>
              </TableRow>
            )}
            {(facilities ?? []).map((f) => (
              <TableRow key={f.id} className="border-border hover:bg-secondary/40">
                <TableCell className="font-semibold text-foreground">{f.name}</TableCell>
                <TableCell className="text-muted-foreground uppercase">{f.type}</TableCell>
                <TableCell className="text-muted-foreground">{f.district}</TableCell>
                <TableCell className="text-muted-foreground">{f.vulnerability}</TableCell>
                <TableCell>
                  {f.has_geom ? (
                    "Yes"
                  ) : (
                    <span className="text-xs text-muted-foreground">No location</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {f.lat != null && f.lng != null
                    ? `${f.lat.toFixed(4)}, ${f.lng.toFixed(4)}`
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{f.contact ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(f.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingFacility(f)}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeletingFacility(f)}>
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
        <FacilityFormDialog
          onOpenChange={(open) => !open && setCreating(false)}
          onSubmit={(values) => createMutation.mutate(values)}
          isPending={createMutation.isPending}
        />
      )}

      {editingFacility && (
        <FacilityFormDialog
          facility={editingFacility}
          onOpenChange={(open) => !open && setEditingFacility(null)}
          onSubmit={(values) => updateMutation.mutate({ id: editingFacility.id, values })}
          isPending={updateMutation.isPending}
        />
      )}

      <AlertDialog
        open={deletingFacility !== null}
        onOpenChange={(open) => !open && setDeletingFacility(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deletingFacility ? `Delete "${deletingFacility.name}"?` : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone and removes the facility entirely, including from the hazard
              map.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <DeleteReasonField
            onConfirm={(reason) => {
              if (deletingFacility) deleteMutation.mutate({ id: deletingFacility.id, reason });
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
        <Label htmlFor="facility-delete-reason">Reason (required)</Label>
        <Input
          id="facility-delete-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this facility being deleted?"
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

function FacilityFormDialog({
  facility,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  facility?: FacilityRow;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FacilityCreate) => void;
  isPending: boolean;
}) {
  const form = useForm<FacilityCreate>({
    resolver: zodResolver(facilityCreateSchema),
    defaultValues: facility
      ? {
          name: facility.name,
          type: facility.type,
          district: facility.district,
          vulnerability: facility.vulnerability,
          contact: facility.contact,
          lat: facility.lat ?? undefined,
          lng: facility.lng ?? undefined,
          lakeId: facility.lake_id,
        }
      : {
          name: "",
          type: "",
          district: "",
          vulnerability: "",
          contact: "",
          lat: undefined,
          lng: undefined,
          lakeId: null,
        },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{facility ? "Edit facility" : "New facility"}</DialogTitle>
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
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="e.g. hospital" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vulnerability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vulnerability</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="e.g. medium" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="district"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>District</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact (optional)</FormLabel>
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lng"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave latitude/longitude blank to keep this facility unmapped — it won't appear on the
              hazard map until both are set.
            </p>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {facility ? "Save changes" : "Create facility"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
