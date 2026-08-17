import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { lakeCreateSchema, type LakeCreate } from "@/lib/admin-schemas";
import { TierBadge, type Tier } from "@/lib/tier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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

const DAM_TYPES = ["moraine", "bedrock", "ice", "unknown"] as const;

export type DistrictOption = { id: string; name: string };

/** The subset of the detail page's `LakeRow` this dialog needs to seed an edit.
 *  Deliberately excludes `currentTier`/`current_risk_score` and `slug` -- see the
 *  locked-fields note below for why those never reach `useForm`. */
export type LakeFormInitial = {
  id: string;
  name: string;
  nameUr: string | null;
  valley: string;
  district_id: string | null;
  damType: string | null;
  glacierContact: boolean | null;
  icimodId: string | null;
  elevationM: number | null;
  historicalGlof: boolean | null;
  source: string | null;
  sourceUrl: string | null;
  downstream_population: number | null;
  area_km2: string | number | null;
  lat: number;
  lng: number;
  current_tier: Tier;
  current_risk_score: string | number | null;
};

/** Shared by admin.lakes.$lakeId.tsx (edit) and admin.lakes.index.tsx (create).
 *  `initial === null` means create mode: the `slug` field renders and is required;
 *  editing a lake never touches slug at all (task #11 plan, "slug is create-only").
 *
 *  currentTier/current_risk_score are rendered as plain JSX off `initial` below,
 *  never as a `useForm` field -- react-hook-form submits every key present in
 *  `defaultValues` regardless of whether an input is bound to it, so seeding those
 *  two into `defaultValues` to render them read-only would make every PUT 400
 *  (task #11 GATE decision 1, layer 0; the same failure shape as #10's finding F1,
 *  from a different cause). */
export function LakeFormDialog({
  initial,
  districts,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  initial: LakeFormInitial | null;
  districts: DistrictOption[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: LakeCreate) => void;
  isPending: boolean;
}) {
  // One stable schema for both modes -- `slug` optional at the client-validation
  // layer regardless of mode, so `useForm`'s inferred field-value type doesn't
  // fork across a create/edit ternary. The server is the actual authority: a
  // create POST still 400s on a missing slug via lakeCreateSchema (unmodified,
  // slug required), and an edit PUT still 400s on a *present* slug via
  // lakeUpdateSchema (slug omitted there entirely) -- this schema only softens
  // the client-side pre-check, it changes nothing about what's enforced server-side.
  const form = useForm({
    resolver: zodResolver(lakeCreateSchema.partial({ slug: true })),
    defaultValues: {
      name: initial?.name ?? "",
      nameUr: initial?.nameUr ?? undefined,
      valley: initial?.valley ?? "",
      district_id: initial?.district_id ?? undefined,
      damType: (initial?.damType as LakeCreate["damType"]) ?? "unknown",
      glacierContact: initial?.glacierContact ?? false,
      icimodId: initial?.icimodId ?? undefined,
      elevationM: initial?.elevationM ?? undefined,
      historicalGlof: initial?.historicalGlof ?? false,
      source: initial?.source ?? "",
      sourceUrl: initial?.sourceUrl ?? undefined,
      downstream_population: initial?.downstream_population ?? 0,
      area_km2: initial?.area_km2 != null ? Number(initial.area_km2) : undefined,
      lat: initial?.lat ?? undefined,
      lng: initial?.lng ?? undefined,
      // Absent entirely (not even `undefined`) when editing -- react-hook-form only
      // submits keys present in defaultValues, so this is what keeps `slug` out of
      // a PUT body, not a hidden/disabled input.
      ...(initial ? {} : { slug: "" }),
    },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit lake" : "New lake"}</DialogTitle>
        </DialogHeader>

        {initial && (
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Tier &amp; risk score
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Set by CryoHealth-api's alert service from hazard-score runs. Read-only here by
                  design — this form won't send them, and the API rejects them if it receives them.
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <TierBadge tier={initial.current_tier} />
                <span className="text-xs text-muted-foreground">
                  Risk:{" "}
                  {initial.current_risk_score != null
                    ? Number(initial.current_risk_score).toFixed(0)
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => onSubmit(values as LakeCreate))}
            className="space-y-4"
          >
            {!initial && (
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. shishper — short, unique, permanent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
              name="nameUr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name (Urdu, optional)</FormLabel>
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
                name="valley"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valley</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>District</FormLabel>
                    <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a district" />
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
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
                    <FormLabel>Longitude</FormLabel>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="damType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dam type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DAM_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
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
                name="icimodId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ICIMOD ID (optional)</FormLabel>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="area_km2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area, km² (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
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
              <FormField
                control={form.control}
                name="elevationM"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Elevation, m (optional)</FormLabel>
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
            </div>

            <FormField
              control={form.control}
              name="downstream_population"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Downstream population</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value ?? 0}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-wrap gap-6">
              <FormField
                control={form.control}
                name="glacierContact"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Glacier contact</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="historicalGlof"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Historical GLOF</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={2}
                      placeholder="Cite the survey, publication, or inventory this lake's data comes from"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sourceUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source URL (optional)</FormLabel>
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

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {initial ? "Save changes" : "Create lake"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
