import { useI18n } from "@/lib/i18n";
import { AlertTriangle } from "lucide-react";

export function DemoBanner() {
  const { t } = useI18n();
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900">
      <AlertTriangle className="mr-1 inline h-3 w-3" />
      {t("demoBanner")}
    </div>
  );
}
