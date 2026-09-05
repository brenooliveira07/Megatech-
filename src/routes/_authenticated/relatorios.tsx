import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, dateTimeBr } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: Relatorios,
});

function Relatorios() {
  const [days, setDays] = useState("30");
  const since = new Date(Date.now() - Number(days)*24*60*60*1000).toISOString();

  const { data: top } = useQuery({
    queryKey: ["report-top", days],
    queryFn: async () => {
      const { data } = await supabase.from("sale_items")
        .select("quantity, subtotal, products(name)").gte("created_at", since);
      const map: Record<string,{name:string;qty:number;total:number}> = {};
      (data ?? []).forEach((r:any)=>{
        const n = r.products?.name ?? "—";
        map[n] = map[n] ?? { name: n, qty: 0, total: 0 };
        map[n].qty += r.quantity; map[n].total += Number(r.subtotal);
      });
      return Object.values(map).sort((a,b)=>b.qty-a.qty).slice(0,10);
    },
  });

  const { data: sales } = useQuery({
    queryKey: ["report-sales", days],
    queryFn: async () => (await supabase.from("sales")
      .select("id,total,created_at,sale_items(quantity,subtotal,products(name))")
      .gte("created_at", since).order("created_at",{ascending:false})).data ?? [],
  });

  const { data: stock } = useQuery({
    queryKey: ["report-stock"],
    queryFn: async () => (await supabase.from("products").select("name, stock_quantity, min_stock, price").order("stock_quantity")).data ?? [],
  });

  const totalPeriod = (sales ?? []).reduce((s,x:any)=> s + Number(x.total), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Vendas, produtos mais vendidos e situação do estoque</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[180px]"><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5"><div className="text-sm text-muted-foreground">Total vendido</div><div className="text-2xl font-bold mt-1">{brl(totalPeriod)}</div></Card>
        <Card className="p-5"><div className="text-sm text-muted-foreground">Vendas no período</div><div className="text-2xl font-bold mt-1">{sales?.length ?? 0}</div></Card>
        <Card className="p-5"><div className="text-sm text-muted-foreground">Ticket médio</div><div className="text-2xl font-bold mt-1">{brl(sales?.length ? totalPeriod / sales.length : 0)}</div></Card>
      </div>

      <Card className="p-5">
        <div className="font-semibold mb-3">Produtos mais vendidos</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip />
              <Bar dataKey="qty" fill="var(--accent)" radius={[8,8,0,0]} name="Quantidade"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <div className="p-4 border-b font-semibold">Histórico de vendas</div>
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Itens</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
          <TableBody>
            {(sales ?? []).map((s:any)=>(
              <TableRow key={s.id}>
                <TableCell>{dateTimeBr(s.created_at)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.sale_items?.map((i:any)=>`${i.quantity}x ${i.products?.name}`).join(", ")}</TableCell>
                <TableCell className="text-right font-medium">{brl(Number(s.total))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <div className="p-4 border-b font-semibold">Relatório de estoque</div>
        <Table>
          <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="text-right">Disponível</TableHead><TableHead className="text-right">Mínimo</TableHead><TableHead className="text-right">Valor unitário</TableHead></TableRow></TableHeader>
          <TableBody>
            {(stock ?? []).map((p:any,i)=>(
              <TableRow key={i}>
                <TableCell>{p.name}</TableCell>
                <TableCell className="text-right">{p.stock_quantity}</TableCell>
                <TableCell className="text-right text-muted-foreground">{p.min_stock}</TableCell>
                <TableCell className="text-right">{brl(Number(p.price))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}