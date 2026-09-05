import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/estoque")({
  component: Estoque,
});

function statusOf(p: { stock_quantity: number; min_stock: number }) {
  if (p.stock_quantity === 0) return { label: "Esgotado", color: "destructive", icon: XCircle, rowClass: "bg-destructive/5" };
  if (p.stock_quantity <= p.min_stock) return { label: "Estoque baixo", color: "warning", icon: AlertTriangle, rowClass: "bg-warning/5" };
  return { label: "Em estoque", color: "success", icon: CheckCircle2, rowClass: "" };
}

function Estoque() {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");

  const { data: products } = useQuery({
    queryKey: ["products-stock"],
    queryFn: async () => (await supabase.from("products").select("*, categories(id,name)").order("name")).data ?? [],
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });

  const filtered = useMemo(() => {
    return (products ?? []).filter((p: any) => {
      const matchS = p.name.toLowerCase().includes(search.toLowerCase());
      const matchC = cat === "all" || p.category_id === cat;
      return matchS && matchC;
    });
  }, [products, search, cat]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Controle de Estoque</h1>
        <p className="text-sm text-muted-foreground">Visualize a quantidade disponível e status de cada produto</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16}/>
            <Input placeholder="Pesquisar por nome..." className="pl-9" value={search} onChange={(e)=>setSearch(e.target.value)} />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-[200px]"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {(categories ?? []).map((c:any)=> <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead><TableHead>Categoria</TableHead>
              <TableHead className="text-right">Disponível</TableHead><TableHead className="text-right">Mínimo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p:any) => {
              const s = statusOf(p);
              const Icon = s.icon;
              return (
                <TableRow key={p.id} className={cn(s.rowClass)}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{p.code}</div>
                  </TableCell>
                  <TableCell>{p.categories?.name ?? "—"}</TableCell>
                  <TableCell className="text-right font-bold">{p.stock_quantity}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{p.min_stock}</TableCell>
                  <TableCell>
                    <Badge variant={s.color === "destructive" ? "destructive" : "secondary"}
                           className={cn(
                             "gap-1",
                             s.color === "warning" && "bg-warning/15 text-warning-foreground border border-warning/30",
                             s.color === "success" && "bg-success/15 text-success border border-success/30",
                           )}>
                      <Icon size={12}/>{s.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum produto encontrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}