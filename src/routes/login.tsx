import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Croissant, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({ component: LoginPage });

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
  remember: z.boolean().optional(),
});
type Form = z.infer<typeof schema>;

function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) router.navigate({ to: "/app/dashboard" });
  }, [user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: "manager@bakery.com", password: "demo1234", remember: true },
  });

  const onSubmit = async (data: Form) => {
    setSubmitting(true);
    try {
      await login(data.email, data.password);
      toast.success("Welcome back");
      router.navigate({ to: "/app/dashboard" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: branding */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 login-gradient text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-20 login-bg-dots" />
        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur grid place-items-center">
            <Croissant className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">Sunrise Bakery OS</span>
        </div>
        <div className="relative space-y-4 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Run your bakery with calm clarity.
          </h1>
          <p className="text-primary-foreground/80 text-base leading-relaxed">
            Track every sale, every loaf, every loss. A modern operations and analytics platform
            built for the bakery floor.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-6">
            {[
              { k: "LKR 1.2M", v: "Sales today" },
              { k: "382", v: "Items sold" },
              { k: "2.1%", v: "Wastage" },
            ].map((s) => (
              <div
                key={s.v}
                className="rounded-xl bg-white/10 backdrop-blur p-4 border border-white/10"
              >
                <div className="text-2xl font-semibold">{s.k}</div>
                <div className="text-xs text-primary-foreground/70 mt-1">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-primary-foreground/70">
          © {new Date().getFullYear()} Sunrise Bakery — MVP
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <Card className="w-full max-w-md p-8 rounded-2xl shadow-sm">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-lg bg-primary grid place-items-center text-primary-foreground">
              <Croissant className="h-5 w-5" />
            </div>
            <span className="font-semibold">BakeryHUB</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back. Enter your credentials to continue.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
                <div className="text-right">
                  <Link to="/register" className="text-xs text-primary hover:underline">
                    Create an account
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={!!watch("remember")}
                onCheckedChange={(c) => setValue("remember", !!c)}
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                Remember me on this device
              </Label>
            </div>

            <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>

            <div className="rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground space-y-1"></div>
          </form>
        </Card>
      </div>
    </div>
  );
}
