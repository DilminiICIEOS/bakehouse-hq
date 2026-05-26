import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, ShoppingCart, Trash2, Boxes, BarChart3,
  Users, Settings, LogOut, Menu, Bell, Croissant, X,
} from "lucide-react";
import { useAuth, ROLE_LABEL } from "@/lib/auth";
import type { Role } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NavItem { to: string; label: string; icon: typeof LayoutDashboard; roles: Role[] }

const NAV: NavItem[] = [
  { to: "/app/dashboard", label: "Dashboard",       icon: LayoutDashboard, roles: ["admin","manager","salesperson"] },
  { to: "/app/sales",     label: "Sales Entry",     icon: ShoppingCart,    roles: ["admin","manager","salesperson"] },
  { to: "/app/wastage",   label: "Wastage",         icon: Trash2,          roles: ["admin","manager","salesperson"] },
  { to: "/app/stock",     label: "Stock Counting",  icon: Boxes,           roles: ["admin","manager","salesperson"] },
  { to: "/app/reports",   label: "Reports",         icon: BarChart3,       roles: ["admin","manager"] },
  { to: "/app/users",     label: "User Management", icon: Users,           roles: ["admin"] },
  { to: "/app/settings",  label: "Settings",        icon: Settings,        roles: ["admin","manager","salesperson"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  if (!user) return null;

  const items = NAV.filter((n) => n.roles.includes(user.role));
  const handleLogout = () => { logout(); router.navigate({ to: "/login" }); };

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const initials = user.name.split(" ").map(p => p[0]).slice(0, 2).join("");

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-sidebar">
        <SidebarContent items={items} pathname={pathname} />
      </aside>

      {/* Sidebar - mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-sidebar flex flex-col">
            <button className="absolute top-3 right-3 p-1" onClick={() => setMobileOpen(false)}>
              <X className="h-5 w-5" />
            </button>
            <SidebarContent items={items} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top nav */}
        <header className="sticky top-0 z-30 h-16 border-b bg-background/80 backdrop-blur flex items-center px-4 sm:px-6 gap-3">
          <button className="lg:hidden p-2 -ml-2" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Sunrise Bakery — Bandra Outlet</span>
            <span className="text-xs text-muted-foreground">{today}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-muted transition">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium leading-tight">{user.name}</span>
                    <span className="text-[11px] text-muted-foreground leading-tight">{ROLE_LABEL[user.role]}</span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground font-normal">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.navigate({ to: "/app/settings" })}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  items, pathname, onNavigate,
}: { items: NavItem[]; pathname: string; onNavigate?: () => void }) {
  const { user } = useAuth();
  return (
    <>
      <div className="h-16 px-5 flex items-center gap-2 border-b">
        <div className="h-9 w-9 rounded-lg bg-primary grid place-items-center text-primary-foreground">
          <Croissant className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold leading-tight">Sunrise</div>
          <div className="text-[11px] text-muted-foreground leading-tight">Bakery OS</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.to || pathname.startsWith(it.to + "/");
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <div className="rounded-lg bg-sidebar-accent p-3 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
              {user ? ROLE_LABEL[user.role] : ""}
            </Badge>
          </div>
          <p className="text-muted-foreground leading-snug">
            MVP build — single outlet operations
          </p>
        </div>
      </div>
    </>
  );
}
