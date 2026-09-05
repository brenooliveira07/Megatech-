import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Package, Boxes, ShoppingCart, BarChart3, Users, LogOut, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const auth = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const collapsed = state === "collapsed";

  const items = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, show: true },
    { title: "Produtos", url: "/produtos", icon: Package, show: true },
    { title: "Estoque", url: "/estoque", icon: Boxes, show: auth.canManageStock },
    { title: "Vendas", url: "/vendas", icon: ShoppingCart, show: auth.canRegisterSales },
    { title: "Relatórios", url: "/relatorios", icon: BarChart3, show: auth.canViewReports },
    { title: "Usuários", url: "/usuarios", icon: Users, show: auth.isManager },
  ];

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--gradient-accent)" }}>
            <Zap className="text-primary-foreground" size={18} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-bold text-sidebar-foreground truncate">Megatech</div>
              <div className="text-[10px] text-sidebar-foreground/60 truncate">Controle Inteligente</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.filter((i) => i.show).map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && auth.user && (
          <div className="text-xs text-sidebar-foreground/70 mb-2 px-1 truncate">{auth.user.email}</div>
        )}
        <SidebarMenuButton onClick={logout} className="text-sidebar-foreground">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}