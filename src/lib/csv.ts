export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length || !rows[0]) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(";"), ...rows.map((r) => keys.map((k) => esc(r[k])).join(";"))].join("\n");
}

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  const first = lines[0];
  if (!first) return [];
  const sep = first.includes(";") ? ";" : ",";
  const split = (l: string) => {
    const out: string[] = [];
    let cur = "", q = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (q) { if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true;
      else if (c === sep) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out;
  };
  const head = split(first).map((h) => h.trim());
  return lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [head[i], v.trim()])));
}

export function download(name: string, content: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
