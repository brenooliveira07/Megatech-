import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Package, AlertTriangle, XCircle, TrendingUp } from "lucide-react";
import { brl } from "@/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function StatCard({ label, value, icon: Icon, tone = "primary" }: { label: string; value: string | number; icon: React.ElementType; tone?: "primary" | "warning" | "destructive" | "success" }) {
  const bg = {
    primary: "var(--gradient-accent)",
    warning: "linear-gradient(135deg, oklch(0.78 0.16 75), oklch(0.65 0.18 60))",
    destructive: "linear-gradient(135deg, oklch(0.65 0.22 25), oklch(0.5 0.2 20))",
    success: "linear-gradient(135deg, oklch(0.65 0.16 155), oklch(0.5 0.14 165))",
  }[tone];
  return (
    <Card className="p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elegant)] transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-3xl font-bold mt-1 text-foreground">{value}</div>
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <Icon className="text-primary-foreground" size={22} />
        </div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [products, sales, movements] = await Promise.all([
        supabase.from("products").select("id, name, stock_quantity, min_stock, price"),
        supabase.from("sales").select("id, total, created_at").gte("created_at", new Date(new Date().setHours(0,0,0,0)).toISOString()),
        supabase.from("stock_movements").select("quantity, created_at, movement_type").gte("created_at", new Date(Date.now() - 7*24*60*60*1000).toISOString()),
      ]);
      const ps = products.data ?? [];
      const ss = sales.data ?? [];
      const ms = movements.data ?? [];
      const lowStock = ps.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock);
      const out = ps.filter((p) => p.stock_quantity === 0);
      const totalSalesToday = ss.reduce((s, x) => s + Number(x.total), 0);

      // movements by day
      const days: Record<string, { day: string; entrada: number; saida: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i*24*60*60*1000);
        const k = d.toISOString().slice(0,10);
        days[k] = { day: d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}), entrada: 0, saida: 0 };
      }
      ms.forEach((m) => {
        const k = m.created_at.slice(0,10);
        if (!days[k]) return;
        if (m.quantity > 0) days[k].entrada += m.quantity;
        else days[k].saida += -m.quantity;
      });

      // top products from sale_items last 30 days
      const { data: si } = await supabase
        .from("sale_items")
        .select("quantity, product_id, products(name)")
        .gte("created_at", new Date(Date.now() - 30*24*60*60*1000).toISOString());
      const map: Record<string, { name: string; qty: number }> = {};
      (si ?? []).forEach((x: any) => {
        const name = x.products?.name ?? "—";
        map[x.product_id] = map[x.product_id] ?? { name, qty: 0 };
        map[x.product_id].qty += x.quantity;
      });
      const top = Object.values(map).sort((a,b)=>b.qty-a.qty).slice(0,5);

      return {
        total: ps.length, low: lowStock.length, out: out.length, totalSalesToday,
        movement: Object.values(days), top,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumo geral do sistema</p>
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Produtos cadastrados" value={stats?.total ?? 0} icon={Package} />
        <StatCard label="Estoque baixo" value={stats?.low ?? 0} icon={AlertTriangle} tone="warning" />
        <StatCard label="Esgotados" value={stats?.out ?? 0} icon={XCircle} tone="destructive" />
        <StatCard label="Vendas hoje" value={brl(stats?.totalSalesToday ?? 0)} icon={TrendingUp} tone="success" />
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="p-5">
          <div className="font-semibold mb-3 text-foreground">Movimentação de estoque (7 dias)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.movement ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="entrada" stroke="var(--success)" strokeWidth={2} name="Entradas" />
                <Line type="monotone" dataKey="saida" stroke="var(--destructive)" strokeWidth={2} name="Saídas" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <div className="font-semibold mb-3 text-foreground">Top produtos (30 dias)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.top ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip />
                <Bar dataKey="qty" fill="var(--accent)" name="Vendidos" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}