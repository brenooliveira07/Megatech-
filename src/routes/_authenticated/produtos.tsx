import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { brl, dateBr } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/produtos")({
  component: Produtos,
});

type Product = {
  id: string; code: string; name: string; description: string | null;
  category_id: string | null; price: number; stock_quantity: number; min_stock: number;
  created_at: string; categories?: { name: string } | null;
};

function Produtos() {
  const qc = useQueryClient();
  const { canManageProducts } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products").select("*, categories(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });

  async function save(form: FormData): Promise<void> {
    const payload = {
      code: String(form.get("code")),
      name: String(form.get("name")),
      description: String(form.get("description") || ""),
      category_id: String(form.get("category_id")) || null,
      price: Number(form.get("price")),
      stock_quantity: Number(form.get("stock_quantity")),
      min_stock: Number(form.get("min_stock")),
    };
    const res = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editing ? "Produto atualizado" : "Produto cadastrado");
    setOpen(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  }

  async function remove(id: string) {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
          <p className="text-sm text-muted-foreground">Cadastro e gerenciamento de produtos</p>
        </div>
        {canManageProducts && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button><Plus className="mr-1" size={16}/> Novo produto</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
              <form action={save} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Código</Label><Input name="code" required defaultValue={editing?.code}/></div>
                  <div><Label>Nome</Label><Input name="name" required defaultValue={editing?.name}/></div>
                </div>
                <div><Label>Descrição</Label><Textarea name="description" defaultValue={editing?.description ?? ""}/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Categoria</Label>
                    <Select name="category_id" defaultValue={editing?.category_id ?? undefined}>
                      <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
                      <SelectContent>
                        {(categories ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Preço</Label><Input type="number" step="0.01" min="0" name="price" required defaultValue={editing?.price}/></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Estoque</Label><Input type="number" min="0" name="stock_quantity" required defaultValue={editing?.stock_quantity ?? 0}/></div>
                  <div><Label>Estoque mínimo</Label><Input type="number" min="0" name="min_stock" required defaultValue={editing?.min_stock ?? 5}/></div>
                </div>
                <DialogFooter><Button type="submit">{editing ? "Salvar" : "Cadastrar"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>Categoria</TableHead>
              <TableHead className="text-right">Preço</TableHead><TableHead className="text-right">Estoque</TableHead>
              <TableHead>Cadastro</TableHead><TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(products ?? []).map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.code}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.categories?.name ?? "—"}</TableCell>
                <TableCell className="text-right">{brl(Number(p.price))}</TableCell>
                <TableCell className="text-right">{p.stock_quantity}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{dateBr(p.created_at)}</TableCell>
                <TableCell>
                  {canManageProducts && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil size={14}/></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 size={14} className="text-destructive"/></Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {products?.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum produto cadastrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}