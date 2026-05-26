import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unauthorized")({ component: Page });

function Page() {
  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-destructive/10 text-destructive grid place-items-center mx-auto">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Access restricted</h1>
        <p className="text-sm text-muted-foreground">
          Your role doesn't have permission to view this page. Please contact your administrator
          if you believe this is a mistake.
        </p>
        <Button asChild><Link to="/app/dashboard">Back to dashboard</Link></Button>
      </div>
    </div>
  );
}
