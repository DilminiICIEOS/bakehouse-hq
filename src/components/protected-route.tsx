import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/mock-data";
import { Skeleton } from "@/components/ui/skeleton";

export function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.navigate({ to: "/login" });
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.navigate({ to: "/unauthorized" });
    }
  }, [user, loading, roles, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen p-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }
  if (roles && !roles.includes(user.role)) return null;
  return <>{children}</>;
}
