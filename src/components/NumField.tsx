import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NumField({ label, value, onChange, suffix, min = 0, className = "" }: { label: string; value: number; onChange: (v: number) => void; suffix?: string; min?: number; className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-xs text-muted-foreground">{label}{suffix ? ` (${suffix})` : ""}</Label>
      <Input type="number" inputMode="decimal" step="0.01" min={min} value={Number.isFinite(value) ? value : 0}
        className="num"
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onChange(Number.isFinite(v) ? Math.max(min, v) : 0);
        }} />
    </div>
  );
}
