import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useAuth, type AppRole, type UserStatus } from "@/hooks/useAuth";
import { toast } from "sonner";
import { dateBr, dateTimeBr } from "@/lib/format";
import {
  Search, MoreHorizontal, Check, X, Ban, ShieldCheck, Pencil, Trash2, ChevronLeft, ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: Usuarios,
});

type Row = {
  id: string;
  full_name: string | null;
  email: string | null;
  status: UserStatus;
  created_at: string;
  last_access_at: string | null;
  roles: AppRole[];
};

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  funcionario: "Funcionário",
  estoquista: "Estoquista",
};

const STATUS_LABELS: Record<UserStatus, string> = {
  ativo: "Ativo",
  pendente: "Pendente",
  bloqueado: "Bloqueado",
};

const PAGE_SIZE = 10;

function StatusBadge({ status }: { status: UserStatus }) {
  const cls =
    status === "ativo"
      ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-100"
      : status === "pendente"
      ? "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100"
      : "bg-red-100 text-red-700 border-red-200 hover:bg-red-100";
  return <Badge variant="outline" className={cls}>{STATUS_LABELS[status]}</Badge>;
}

function Usuarios() {
  const auth = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!auth.loading && !auth.rolesLoading && !auth.isManager) {
      navigate({ to: "/dashboard" });
    }
  }, [auth.isManager, auth.loading, auth.rolesLoading, navigate]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [page, setPage] = useState(1);

  const [editRow, setEditRow] = useState<Row | null>(null);
  const [editName, setEditName] = useState("");

  const [roleRow, setRoleRow] = useState<Row | null>(null);
  const [newRole, setNewRole] = useState<AppRole>("funcionario");

  const [deleteRow, setDeleteRow] = useState<Row | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users-list"],
    queryFn: async (): Promise<Row[]> => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, status, created_at, last_access_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const map = new Map<string, AppRole[]>();
      (roles ?? []).forEach((r: { user_id: string; role: AppRole }) => {
        const arr = map.get(r.user_id) ?? [];
        arr.push(r.role);
        map.set(r.user_id, arr);
      });
      return (profiles ?? []).map((p) => ({
        ...(p as Omit<Row, "roles">),
        roles: map.get(p.id) ?? [],
      }));
    },
    enabled: auth.isManager,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users ?? []).filter((u) => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (roleFilter !== "all" && !u.roles.includes(roleFilter)) return false;
      if (!q) return true;
      return (
        (u.full_name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        u.roles.some((r) => ROLE_LABELS[r].toLowerCase().includes(q))
      );
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter]);

  async function setStatus(uid: string, status: UserStatus, label: string) {
    const { error } = await supabase.rpc("admin_set_user_status", { _target: uid, _status: status });
    if (error) return toast.error(error.message);
    toast.success(label);
    qc.invalidateQueries({ queryKey: ["users-list"] });
  }

  async function saveRole() {
    if (!roleRow) return;
    const { error } = await supabase.rpc("admin_set_user_role", { _target: roleRow.id, _role: newRole });
    if (error) return toast.error(error.message);
    toast.success("Cargo atualizado");
    setRoleRow(null);
    qc.invalidateQueries({ queryKey: ["users-list"] });
  }

  async function saveEdit() {
    if (!editRow) return;
    const { error } = await supabase.rpc("admin_update_profile", { _target: editRow.id, _full_name: editName });
    if (error) return toast.error(error.message);
    toast.success("Usuário atualizado");
    setEditRow(null);
    qc.invalidateQueries({ queryKey: ["users-list"] });
  }

  async function confirmDelete() {
    if (!deleteRow) return;
    const { error } = await supabase.rpc("admin_delete_user", { _target: deleteRow.id });
    if (error) return toast.error(error.message);
    toast.success("Usuário excluído");
    setDeleteRow(null);
    qc.invalidateQueries({ queryKey: ["users-list"] });
  }

  if (auth.loading || auth.rolesLoading) {
    return <div className="p-8 text-muted-foreground">Carregando...</div>;
  }
  if (!auth.isManager) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Usuários</h1>
        <p className="text-sm text-muted-foreground">Aprove novos cadastros, defina cargos e controle o acesso ao sistema.</p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16}/>
            <Input
              placeholder="Pesquisar por nome, e-mail ou cargo"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Cargo"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cargos</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="gerente">Gerente</SelectItem>
                <SelectItem value="funcionario">Funcionário</SelectItem>
                <SelectItem value="estoquista">Estoquista</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="bloqueado">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && pageItems.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
              )}
              {pageItems.map((u) => {
                const isSelf = u.id === auth.user?.id;
                const targetIsGestor = u.roles.includes("admin") || u.roles.includes("gerente");
                const canManageThisUser = auth.isAdmin || !targetIsGestor;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {u.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        {u.roles.map((r) => (
                          <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>
                            {ROLE_LABELS[r]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={u.status}/></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{dateBr(u.created_at)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.last_access_at ? dateTimeBr(u.last_access_at) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {u.status === "pendente" && canManageThisUser && !isSelf && (
                          <>
                            <Button size="sm" variant="default"
                              onClick={() => setStatus(u.id, "ativo", "Usuário aprovado")}>
                              <Check size={14} className="mr-1"/> Aprovar
                            </Button>
                            <Button size="sm" variant="outline"
                              onClick={() => setStatus(u.id, "bloqueado", "Solicitação rejeitada")}>
                              <X size={14} className="mr-1"/> Rejeitar
                            </Button>
                          </>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" disabled={isSelf}>
                              <MoreHorizontal size={16}/>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem
                              disabled={!canManageThisUser}
                              onClick={() => { setEditRow(u); setEditName(u.full_name ?? ""); }}>
                              <Pencil size={14} className="mr-2"/> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!canManageThisUser}
                              onClick={() => { setRoleRow(u); setNewRole(u.roles[0] ?? "funcionario"); }}>
                              <ShieldCheck size={14} className="mr-2"/> Alterar cargo
                            </DropdownMenuItem>
                            <DropdownMenuSeparator/>
                            {u.status !== "ativo" && (
                              <DropdownMenuItem
                                disabled={!canManageThisUser}
                                onClick={() => setStatus(u.id, "ativo", "Usuário ativado")}>
                                <Check size={14} className="mr-2"/> Ativar
                              </DropdownMenuItem>
                            )}
                            {u.status !== "bloqueado" && (
                              <DropdownMenuItem
                                disabled={!canManageThisUser}
                                onClick={() => setStatus(u.id, "bloqueado", "Usuário bloqueado")}>
                                <Ban size={14} className="mr-2"/> Bloquear
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={!auth.isAdmin}
                              onClick={() => setDeleteRow(u)}>
                              <Trash2 size={14} className="mr-2"/> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>{filtered.length} usuário(s) — página {pageSafe} de {totalPages}</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={pageSafe <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft size={16}/>
            </Button>
            <Button size="sm" variant="outline" disabled={pageSafe >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              <ChevronRight size={16}/>
            </Button>
          </div>
        </div>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>{editRow?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome completo</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)}/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>Cancelar</Button>
            <Button onClick={saveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role dialog */}
      <Dialog open={!!roleRow} onOpenChange={(o) => !o && setRoleRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar cargo</DialogTitle>
            <DialogDescription>{roleRow?.full_name} — {roleRow?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Cargo</Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                {auth.isAdmin && <SelectItem value="admin">Administrador</SelectItem>}
                {auth.isAdmin && <SelectItem value="gerente">Gerente</SelectItem>}
                <SelectItem value="funcionario">Funcionário</SelectItem>
                <SelectItem value="estoquista">Estoquista</SelectItem>
              </SelectContent>
            </Select>
            {!auth.isAdmin && (
              <p className="text-xs text-muted-foreground">
                Gerentes podem atribuir apenas Funcionário ou Estoquista.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleRow(null)}>Cancelar</Button>
            <Button onClick={saveRole}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir usuário?</DialogTitle>
            <DialogDescription>
              Esta ação é permanente. O usuário {deleteRow?.full_name ?? deleteRow?.email} e todos os seus dados de acesso serão removidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRow(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Excluir definitivamente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}