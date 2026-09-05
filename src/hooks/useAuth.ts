import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "gerente" | "funcionario" | "estoquista";
export type UserStatus = "pendente" | "ativo" | "bloqueado";

export interface AuthState {
  user: User | null;
  loading: boolean;
  rolesLoading: boolean;
  roles: AppRole[];
  status: UserStatus | null;
  isAdmin: boolean;
  isGerente: boolean;
  isFuncionario: boolean;
  isEstoquista: boolean;
  isManager: boolean;
  canManageProducts: boolean;
  canManageStock: boolean;
  canRegisterSales: boolean;
  canViewReports: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    const refreshUserData = () => {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          setRolesLoading(true);
          loadUserData(data.user.id);
        }
      });
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setRolesLoading(true);
        setTimeout(() => loadUserData(session.user.id), 0);
      } else {
        setRoles([]);
        setStatus(null);
        setRolesLoading(false);
      }
    });
    window.addEventListener("megatech:user-data-changed", refreshUserData);
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadUserData(data.session.user.id);
      else setRolesLoading(false);
      setLoading(false);
    });
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("megatech:user-data-changed", refreshUserData);
    };
  }, []);

  async function loadUserData(uid: string) {
    try {
      const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      setRoles(((rolesData ?? []) as { role: AppRole }[]).map((r) => r.role));
      const { data: st } = await supabase.rpc("my_status");
      setStatus((st as UserStatus | null) ?? null);
      if (st === "ativo") {
        supabase.rpc("touch_last_access");
      }
    } finally {
      setRolesLoading(false);
    }
  }

  const isAdmin = roles.includes("admin");
  const isGerente = roles.includes("gerente");
  const isFuncionario = roles.includes("funcionario");
  const isEstoquista = roles.includes("estoquista");
  const isManager = isAdmin || isGerente;
  return {
    user, loading, rolesLoading, roles, status,
    isAdmin, isGerente, isFuncionario, isEstoquista, isManager,
    canManageProducts: isAdmin || isGerente || isEstoquista,
    canManageStock: isAdmin || isGerente || isEstoquista,
    canRegisterSales: isAdmin || isGerente || isFuncionario,
    canViewReports: isAdmin || isGerente,
  };
}