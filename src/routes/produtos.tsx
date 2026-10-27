import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Copy, Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { NumField } from "@/components/NumField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFinance, emptyProduct, uid } from "@/lib/store";
import { MARKETPLACES, cmv, fmtBRL, fmtNum, fmtPct, marginLevel, unitMargin, variableBreakdown, type Product } from "@/lib/finance";
import { toCsv, parseCsv, download } from "@/lib/csv";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos e precificação — Gestão E-commerce" },
      { name: "description", content: "Cadastre produtos, custos variáveis e taxas de marketplace e veja a margem de contribuição de cada um." },
      { property: "og:title", content: "Produtos e precificação — Gestão E-commerce" },
      { property: "og:description", content: "Cadastre produtos e veja a margem de contribuição de cada um." },
    ],
  }),
  component: Produtos,
});

const FIELDS: (keyof Product)[] = ["name", "sku", "category", "marketplace", "active", "purchasePrice", "acquisitionFreight", "packaging", "otherProductCosts", "salePrice", "commissionPct", "fixedFee", "subsidizedFreight", "taxPct", "adsMode", "adsValue", "otherSellingCosts", "monthlyQty"];

function Produtos() {
  const { products, setProducts, thresholds, setThresholds } = useFinance();
  const [editing, setEditing] = useState<Product | null>(null);
  const [q, setQ] = useState("");
  const [mkt, setMkt] = useState("todos");
  const fileRef = useRef<HTMLInputElement>(null);

  const list = products.filter((p) => (mkt === "todos" || p.marketplace === mkt) && `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(q.toLowerCase()));
  const save = (p: Product) => {
    setProducts((all) => (all.some((x) => x.id === p.id) ? all.map((x) => (x.id === p.id ? p : x)) : [...all, p]));
    setEditing(null);
  };

  const onImport = async (f: File) => {
    const rows = parseCsv(await f.text());
    const imported = rows.map((r) => {
      const p = emptyProduct();
      for (const k of FIELDS) {
        if (r[k] === undefined) continue;
        const cur = p[k];
        (p as unknown as Record<string, unknown>)[k] = typeof cur === "number" ? parseFloat(r[k].replace(",", ".")) || 0 : typeof cur === "boolean" ? r[k] !== "false" && r[k] !== "0" : r[k];
      }
      return p;
    }).filter((p) => p.name);
    setProducts((all) => [...all, ...imported]);
  };

  const levelBadge = (pct: number) => {
    const l = marginLevel(pct, thresholds);
    const cls = l === "negative" ? "bg-destructive/10 text-destructive" : l === "low" ? "bg-warning/15 text-foreground" : "bg-success/10 text-success";
    return <span className={`num rounded px-1.5 py-0.5 text-xs font-semibold ${cls}`}>{fmtPct(pct)}</span>;
  };

  return (
    <AppShell title="Produtos e precificação" subtitle="Margem de contribuição não é lucro: ela ainda precisa pagar os custos fixos."
      actions={<div className="flex flex-wrap gap-2">
        <input ref={fileRef} type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload /> Importar CSV</Button>
        <Button variant="outline" size="sm" onClick={() => download("produtos.csv", toCsv(products.map((p) => Object.fromEntries(FIELDS.map((k) => [k, p[k]])))))}><Download /> Exportar</Button>
        <Button size="sm" onClick={() => setEditing(emptyProduct())}><Plus /> Novo produto</Button>
      </div>}>
      <div className="flex flex-wrap items-end gap-3">
        <Input placeholder="Buscar produto, SKU ou categoria" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={mkt} onValueChange={setMkt}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos marketplaces</SelectItem>{MARKETPLACES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <NumField label="MC baixa abaixo de" suffix="%" value={thresholds.low} onChange={(low) => setThresholds({ low })} className="w-40" />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Produto</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Compra</TableHead><TableHead className="text-right">Venda</TableHead>
            <TableHead className="text-right">Custos var.</TableHead><TableHead className="text-right">MC R$</TableHead><TableHead className="text-right">MC %</TableHead>
            <TableHead className="text-right">Qtd/mês</TableHead><TableHead className="text-right">MC total</TableHead><TableHead />
          </TableRow></TableHeader>
          <TableBody>
            {list.map((p) => {
              const m = unitMargin(p);
              return (
                <TableRow key={p.id} className={p.active ? "" : "opacity-50"}>
                  <TableCell><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.marketplace}{p.demo && <Badge variant="secondary" className="ml-2">exemplo</Badge>}{!p.active && " · inativo"}</div></TableCell>
                  <TableCell className="text-xs">{p.sku}</TableCell>
                  <TableCell className="num text-right">{fmtBRL(p.purchasePrice)}</TableCell>
                  <TableCell className="num text-right">{fmtBRL(p.salePrice)}</TableCell>
                  <TableCell className="num text-right">{fmtBRL(m.variableCost)}</TableCell>
                  <TableCell className={`num text-right ${m.mc < 0 ? "text-destructive" : ""}`}>{fmtBRL(m.mc)}</TableCell>
                  <TableCell className="text-right">{levelBadge(m.mcPct)}</TableCell>
                  <TableCell className="num text-right">{fmtNum(p.monthlyQty)}</TableCell>
                  <TableCell className="num text-right font-semibold">{fmtBRL(m.mc * p.monthlyQty)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEditing(p)}><Pencil /></Button>
                    <Button variant="ghost" size="icon" aria-label="Duplicar" onClick={() => setProducts((a) => [...a, { ...p, id: uid(), name: `${p.name} (cópia)`, demo: false }])}><Copy /></Button>
                    <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => confirm(`Excluir ${p.name}?`) && setProducts((a) => a.filter((x) => x.id !== p.id))}><Trash2 /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!list.length && <TableRow><TableCell colSpan={10} className="py-10 text-center text-muted-foreground">Nenhum produto. Clique em “Novo produto” para começar.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      {editing && <ProductDialog product={editing} onClose={() => setEditing(null)} onSave={save} />}
    </AppShell>
  );
}

function ProductDialog({ product, onClose, onSave }: { product: Product; onClose: () => void; onSave: (p: Product) => void }) {
  const [p, setP] = useState(product);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }));
  const m = unitMargin(p);
  const b = variableBreakdown(p);
  const valid = p.name.trim() && p.salePrice > 0;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{product.name ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1 sm:col-span-2"><Label className="text-xs text-muted-foreground">Nome</Label><Input value={p.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">SKU</Label><Input value={p.sku} onChange={(e) => set("sku", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">Categoria</Label><Input value={p.category} onChange={(e) => set("category", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">Marketplace</Label>
            <Select value={p.marketplace} onValueChange={(v) => set("marketplace", v as Product["marketplace"])}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MARKETPLACES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex items-center gap-2 pt-6"><Switch checked={p.active} onCheckedChange={(v) => set("active", v)} /><Label>Ativo</Label></div>
        </div>
        <h3 className="mt-2 text-sm font-semibold">Aquisição</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <NumField label="Preço de compra" suffix="R$" value={p.purchasePrice} onChange={(v) => set("purchasePrice", v)} />
          <NumField label="Frete aquisição/un" suffix="R$" value={p.acquisitionFreight} onChange={(v) => set("acquisitionFreight", v)} />
          <NumField label="Embalagem/un" suffix="R$" value={p.packaging} onChange={(v) => set("packaging", v)} />
          <NumField label="Outros custos produto" suffix="R$" value={p.otherProductCosts} onChange={(v) => set("otherProductCosts", v)} />
        </div>
        <h3 className="mt-2 text-sm font-semibold">Venda (tarifas editáveis — confira as do seu marketplace)</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <NumField label="Preço de venda" suffix="R$" value={p.salePrice} onChange={(v) => set("salePrice", v)} />
          <NumField label="Comissão" suffix="%" value={p.commissionPct} onChange={(v) => set("commissionPct", v)} />
          <NumField label="Tarifa fixa/venda" suffix="R$" value={p.fixedFee} onChange={(v) => set("fixedFee", v)} />
          <NumField label="Frete subsidiado" suffix="R$" value={p.subsidizedFreight} onChange={(v) => set("subsidizedFreight", v)} />
          <NumField label="Imposto efetivo" suffix="%" value={p.taxPct} onChange={(v) => set("taxPct", v)} />
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">ADS em</Label>
            <Select value={p.adsMode} onValueChange={(v) => set("adsMode", v as "pct" | "unit")}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="pct">% do preço</SelectItem><SelectItem value="unit">R$ por unidade</SelectItem></SelectContent></Select></div>
          <NumField label="ADS" suffix={p.adsMode === "pct" ? "%" : "R$"} value={p.adsValue} onChange={(v) => set("adsValue", v)} />
          <NumField label="Outros custos venda" suffix="R$" value={p.otherSellingCosts} onChange={(v) => set("otherSellingCosts", v)} />
          <NumField label="Quantidade mensal" suffix="un" value={p.monthlyQty} onChange={(v) => set("monthlyQty", Math.round(v))} />
        </div>
        <div className="grid gap-2 rounded-md bg-muted p-3 text-sm sm:grid-cols-2">
          <div className="space-y-0.5 text-xs text-muted-foreground">
            <div>CMV (compra + frete aquisição): <b className="num text-foreground">{fmtBRL(cmv(p))}</b></div>
            <div>Comissão: <span className="num">{fmtBRL(b.commission)}</span> · Imposto: <span className="num">{fmtBRL(b.tax)}</span> · ADS: <span className="num">{fmtBRL(b.ads)}</span></div>
            <div>Custo variável total: <b className="num text-foreground">{fmtBRL(m.variableCost)}</b></div>
          </div>
          <div className="space-y-0.5">
            <div>Margem de contribuição: <b className={`num ${m.mc < 0 ? "text-destructive" : "text-success"}`}>{fmtBRL(m.mc)} ({fmtPct(m.mcPct)})</b></div>
            <div className="text-xs text-muted-foreground">Markup sobre o CMV: <span className="num">{m.markup.toFixed(2)}×</span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!valid} onClick={() => onSave({ ...p, demo: false })}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
