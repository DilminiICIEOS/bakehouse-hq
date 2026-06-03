import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user } = useAuth();
  const [outlet, setOutlet] = useState("Sunrise Bakery — Colombo Outlet");
  const [currency, setCurrency] = useState(() => {
    try {
      if (typeof window !== "undefined") return localStorage.getItem("bakery_currency") || "LKR";
    } catch (e) {
      /* ignore */
    }
    return "LKR";
  });
  const [theme, setTheme] = useState(false);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const response = await api.saveOutletSettings({ outlet, currency });
      if (typeof window !== "undefined") {
        localStorage.setItem("bakery_currency", currency);
      }
      return response;
    },
    onSuccess: () => {
      toast.success("Settings saved successfully");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || "Failed to save settings");
    },
  });

  return (
    <>
      <PageHeader title="Settings" description="Outlet and formatting preferences." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-xl p-6 lg:col-span-2 space-y-5">
          <div>
            <h3 className="font-semibold">Outlet information</h3>
            <p className="text-xs text-muted-foreground mt-1">MVP supports a single outlet.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Outlet name</Label>
              <Input value={outlet} onChange={(e) => setOutlet(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select
                value={currency}
                onValueChange={(v) => {
                  setCurrency(v);
                  try {
                    localStorage.setItem("bakery_currency", v);
                  } catch (e) {
                    /* ignore */
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LKR">LKR — Sri Lankan Rupee (Rs.)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold">Appearance</h3>
            <p className="text-xs text-muted-foreground mt-1">Display preferences.</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Dark mode</div>
                <div className="text-xs text-muted-foreground">Use a warmer dark theme</div>
              </div>
              <Switch
                checked={theme}
                onCheckedChange={(c) => {
                  setTheme(c);
                  document.documentElement.classList.toggle("dark", c);
                }}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
              {saveSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save changes
            </Button>
          </div>
        </Card>

        <Card className="rounded-xl p-6 space-y-4 h-fit">
          <h3 className="font-semibold">Your account</h3>
          <div className="text-sm space-y-1">
            <div className="text-muted-foreground text-xs">Name</div>
            <div className="font-medium">{user?.name}</div>
          </div>
          <div className="text-sm space-y-1">
            <div className="text-muted-foreground text-xs">Email</div>
            <div className="font-medium">{user?.email}</div>
          </div>
          <div className="text-sm space-y-1">
            <div className="text-muted-foreground text-xs">Role</div>
            <div className="font-medium capitalize">{user?.role}</div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              try {
                if (!user?.id) {
                  toast.error("No user available");
                  return;
                }
                await api.resetUserPassword(user.id);
                toast.success("Password reset email sent");
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                toast.error(msg || "Failed to send reset email");
              }
            }}
          >
            Change password
          </Button>
        </Card>
      </div>
    </>
  );
}
