import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Ban } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading, status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  if (loading || !user || status === null) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (status === "pendente" || status === "bloqueado") {
    const pending = status === "pendente";
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${pending ? "bg-yellow-100" : "bg-red-100"}`}>
            {pending ? <Clock className="text-yellow-600" size={28}/> : <Ban className="text-red-600" size={28}/>}
          </div>
          <h1 className="text-xl font-bold">{pending ? "Aguardando aprovação" : "Acesso bloqueado"}</h1>
          <p className="text-sm text-muted-foreground">
            {pending
              ? "Sua conta está aguardando aprovação do gerente."
              : "Sua solicitação foi recusada ou sua conta foi bloqueada. Entre em contato com o administrador."}
          </p>
          <Button onClick={signOut} variant="outline" className="w-full">Sair</Button>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4 gap-3 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="font-semibold text-foreground">Megatech</div>
            <span className="text-xs text-muted-foreground hidden sm:inline">— Controle Inteligente de Produtos</span>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}