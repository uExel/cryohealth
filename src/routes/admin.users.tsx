import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { fetchAdminUsers, fetchFacilitiesAdmin, adminRequest } from "@/lib/cryohealth-client";
import {
  userCreateSchema,
  USER_ROLES,
  type UserCreate,
  type UserUpdate,
} from "@/lib/admin-schemas";
import { CryoHealthAdminOnly } from "@/components/cryohealth/AdminPlaceholder";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
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

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [{ title: "Users & roles — Admin — CryoHealth" }, { name: "robots", content: "noindex" }],
  }),
  component: UsersAdmin,
});

type UserRow = {
  id: string;
  name: string;
  role: (typeof USER_ROLES)[number];
  lhw_id: string | null;
  phone: string | null;
  facility_id: string | null;
  facility_name: string | null;
  active: boolean;
  created_at: string;
};

type FacilityRow = { id: string; name: string };

const ROLE_LABELS: Record<(typeof USER_ROLES)[number], string> = {
  cryohealth_admin: "CryoHealth admin",
  facility_admin: "Facility admin",
  chw: "CHW",
  viewer: "Viewer",
};

function UsersAdmin() {
  const { isCryoHealthAdmin, user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [rerolingUser, setRerolingUser] = useState<UserRow | null>(null);
  const [togglingUser, setTogglingUser] = useState<UserRow | null>(null);

  // The API enforces this too (403 from requireRole) -- this only avoids rendering a
  // table that would be empty-with-an-error for a facility_admin who guessed the URL.
  const enabled = isCryoHealthAdmin;

  const {
    data: users,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-users"],
    enabled,
    queryFn: async (): Promise<UserRow[]> => {
      const { users } = await fetchAdminUsers();
      return users as UserRow[];
    },
  });

  const { data: facilities } = useQuery({
    queryKey: ["admin-facilities"],
    enabled,
    queryFn: async (): Promise<FacilityRow[]> => {
      const { facilities } = await fetchFacilitiesAdmin();
      return facilities as FacilityRow[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: UserCreate) => {
      const result = await adminRequest("/users", {
        method: "POST",
        body: JSON.stringify(values),
      });
      if (!result.ok) throw new Error(result.body.error ?? "Failed to create user");
      return result.body.user;
    },
    onSuccess: () => {
      toast.success("User created");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setCreating(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: UserUpdate }) => {
      const result = await adminRequest(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      });
      if (!result.ok) throw new Error(result.body.error ?? "Failed to update user");
      return result.body.user as UserRow;
    },
    onSuccess: (user) => {
      toast.success(user.active ? "User updated" : "User deactivated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setRerolingUser(null);
      setTogglingUser(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isCryoHealthAdmin) return <CryoHealthAdminOnly />;

  const activeCount = (users ?? []).filter((u) => u.active).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Users &amp; roles</h1>
          <p className="text-sm text-muted-foreground">
            {users?.length ?? 0} users · {activeCount} active. Accounts are deactivated, never
            deleted — case records reference them.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>New user</Button>
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
          Couldn't load users. Showing whatever loaded previously, if anything.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs uppercase text-muted-foreground">Name</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Role</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">LHW ID</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Phone</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Facility</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Status</TableHead>
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
            {!isLoading && !isError && (users ?? []).length === 0 && (
              <TableRow className="border-border">
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  No users yet.
                </TableCell>
              </TableRow>
            )}
            {(users ?? []).map((u) => (
              <TableRow
                key={u.id}
                className={`border-border hover:bg-secondary/40 ${u.active ? "" : "opacity-60"}`}
              >
                <TableCell className="font-semibold text-foreground">
                  {u.name}
                  {u.id === currentUser?.id && (
                    <span className="ms-2 text-xs font-normal text-muted-foreground">(you)</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={u.role === "cryohealth_admin" ? "default" : "secondary"}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.lhw_id ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{u.phone ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{u.facility_name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={u.active ? "outline" : "destructive"}>
                    {u.active ? "Active" : "Deactivated"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setRerolingUser(u)}>
                      Change role
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setTogglingUser(u)}>
                      {u.active ? "Deactivate" : "Reactivate"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {creating && (
        <UserFormDialog
          facilities={facilities ?? []}
          onOpenChange={(open) => !open && setCreating(false)}
          onSubmit={(values) => createMutation.mutate(values)}
          isPending={createMutation.isPending}
        />
      )}

      {rerolingUser && (
        <RoleDialog
          user={rerolingUser}
          isSelf={rerolingUser.id === currentUser?.id}
          onOpenChange={(open) => !open && setRerolingUser(null)}
          onSubmit={(role) => updateMutation.mutate({ id: rerolingUser.id, values: { role } })}
          isPending={updateMutation.isPending}
        />
      )}

      <AlertDialog
        open={togglingUser !== null}
        onOpenChange={(open) => !open && setTogglingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {togglingUser
                ? togglingUser.active
                  ? `Deactivate "${togglingUser.name}"?`
                  : `Reactivate "${togglingUser.name}"?`
                : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {togglingUser?.active
                ? "They will no longer be able to sign in. Their cases and audit history stay intact — this is not a delete, and it can be undone by reactivating them."
                : "They will be able to sign in again with their existing PIN."}
              {togglingUser?.id === currentUser?.id && togglingUser?.active && (
                <span className="mt-2 block font-semibold text-foreground">
                  This is your own account — you will be signed out of admin access.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={updateMutation.isPending}
              onClick={(e) => {
                // preventDefault: AlertDialogAction closes the dialog on click, which
                // would unmount the row before an error toast can be tied to it (the
                // last-admin 409 is a real, expected outcome here, not an edge case).
                e.preventDefault();
                if (togglingUser)
                  updateMutation.mutate({
                    id: togglingUser.id,
                    values: { active: !togglingUser.active },
                  });
              }}
            >
              {togglingUser?.active ? "Deactivate" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function RoleDialog({
  user,
  isSelf,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  user: UserRow;
  isSelf: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (role: (typeof USER_ROLES)[number]) => void;
  isPending: boolean;
}) {
  const [role, setRole] = useState<(typeof USER_ROLES)[number]>(user.role);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            {user.name} is currently {ROLE_LABELS[user.role]}.
            {isSelf && user.role === "cryohealth_admin" && (
              <span className="mt-2 block font-semibold text-foreground">
                This is your own account — demoting yourself removes your access to this page.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <Select value={role} onValueChange={(v) => setRole(v as (typeof USER_ROLES)[number])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {USER_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button disabled={isPending || role === user.role} onClick={() => onSubmit(role)}>
            Save role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Create-only: there is no edit-user form. Issue #16 scopes writes on an existing
 *  user to role and active (see userUpdateSchema), so name/lhwId/phone/facility are
 *  set once at creation. */
function UserFormDialog({
  facilities,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  facilities: FacilityRow[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UserCreate) => void;
  isPending: boolean;
}) {
  const form = useForm<UserCreate>({
    resolver: zodResolver(userCreateSchema),
    // `role` is deliberately unset -- a security-sensitive field should be an explicit
    // choice, not whatever the form happened to default to.
    defaultValues: { name: "", lhwId: "", phone: null, facilityId: null, pin: "" },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New user</DialogTitle>
          <DialogDescription>
            The PIN is hashed on the server before it is stored, and is never shown again — hand it
            to the user directly.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
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
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {USER_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
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
              name="lhwId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LHW ID</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="e.g. chw-014"
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? null : e.target.value)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Sign-in accepts either the LHW ID or the phone number — at least one is
                    required.
                  </FormDescription>
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
              name="facilityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facility (optional)</FormLabel>
                  <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No facility" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {facilities.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
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
              name="pin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PIN</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      type="password"
                      autoComplete="new-password"
                      placeholder="At least 4 characters"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                Create user
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
