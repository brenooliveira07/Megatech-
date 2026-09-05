import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { brl, dateTimeBr } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/vendas")({
  component: Vendas,
});

type Item = { product_id: string; name: string; quantity: number; unit_price: number };

function Vendas() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [productId, setProductId] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: products } = useQuery({
    queryKey: ["products-for-sale"],
    queryFn: async () => (await supabase.from("products").select("id, name, price, stock_quantity").gt("stock_quantity", 0).order("name")).data ?? [],
  });

  const { data: sales } = useQuery({
    queryKey: ["sales-list"],
    queryFn: async () => (await supabase.from("sales")
      .select("id, total, created_at, sale_items(quantity, products(name))")
      .order("created_at",{ascending:false}).limit(20)).data ?? [],
  });

  const total = useMemo(() => items.reduce((s,i)=> s + i.quantity * i.unit_price, 0), [items]);

  function addItem() {
    const p = (products ?? []).find((x:any)=> x.id === productId);
    if (!p) return toast.error("Selecione um produto");
    if (qty <= 0) return toast.error("Quantidade inválida");
    if (qty > p.stock_quantity) return toast.error("Estoque insuficiente");
    setItems((prev) => {
      const ex = prev.find((i)=> i.product_id === p.id);
      if (ex) return prev.map((i)=> i.product_id === p.id ? {...i, quantity: i.quantity + qty} : i);
      return [...prev, { product_id: p.id, name: p.name, quantity: qty, unit_price: Number(p.price) }];
    });
    setProductId(""); setQty(1);
  }

  async function register() {
    if (!user) return;
    if (items.length === 0) return toast.error("Adicione ao menos um item");
    setSaving(true);
    const { data: sale, error } = await supabase.from("sales")
      .insert({ user_id: user.id, total }).select().single();
    if (error || !sale) { setSaving(false); return toast.error(error?.message ?? "Erro"); }
    const payload = items.map((i)=> ({
      sale_id: sale.id, product_id: i.product_id,
      quantity: i.quantity, unit_price: i.unit_price, subtotal: i.quantity * i.unit_price,
    }));
    const r = await supabase.from("sale_items").insert(payload);
    setSaving(false);
    if (r.error) {
      await supabase.from("sales").delete().eq("id", sale.id);
      return toast.error(r.error.message);
    }
    toast.success("Venda registrada! Estoque atualizado.");
    setItems([]);
    qc.invalidateQueries();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Registro de Vendas</h1>
        <p className="text-sm text-muted-foreground">Selecione produtos, calcule o total e dê baixa no estoque automaticamente</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
            <div>
              <Label>Produto</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger>
                <SelectContent>
                  {(products ?? []).map((p:any)=>(
                    <SelectItem key={p.id} value={p.id}>{p.name} — {brl(Number(p.price))} ({p.stock_quantity} un)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Quantidade</Label><Input type="number" min={1} value={qty} onChange={(e)=>setQty(Number(e.target.value))}/></div>
            <div className="flex items-end"><Button onClick={addItem}>Adicionar</Button></div>
          </div>

          <Table>
            <TableHeader>
              <TableRow><TableHead>Produto</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Unit.</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead className="w-10"></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i)=>(
                <TableRow key={i.product_id}>
                  <TableCell>{i.name}</TableCell>
                  <TableCell className="text-right">{i.quantity}</TableCell>
                  <TableCell className="text-right">{brl(i.unit_price)}</TableCell>
                  <TableCell className="text-right font-medium">{brl(i.quantity * i.unit_price)}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={()=> setItems(items.filter((x)=>x.product_id !== i.product_id))}><Trash2 size={14} className="text-destructive"/></Button></TableCell>
                </TableRow>
              ))}
              {items.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Nenhum item adicionado</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-5 h-fit">
          <div className="text-sm text-muted-foreground">Total da venda</div>
          <div className="text-4xl font-bold text-foreground mt-1">{brl(total)}</div>
          <Button className="w-full mt-4" size="lg" onClick={register} disabled={saving || items.length === 0}>
            <ShoppingCart className="mr-2" size={16}/> {saving ? "Registrando..." : "Registrar venda"}
          </Button>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b font-semibold">Últimas vendas</div>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Data</TableHead><TableHead>Itens</TableHead><TableHead className="text-right">Total</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {(sales ?? []).map((s:any)=>(
              <TableRow key={s.id}>
                <TableCell>{dateTimeBr(s.created_at)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.sale_items?.map((it:any)=> `${it.quantity}x ${it.products?.name}`).join(", ")}</TableCell>
                <TableCell className="text-right font-medium">{brl(Number(s.total))}</TableCell>
              </TableRow>
            ))}
            {sales?.length === 0 && <TableRow><TableCell colSpan={3} className="py-6 text-center text-muted-foreground">Nenhuma venda</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}