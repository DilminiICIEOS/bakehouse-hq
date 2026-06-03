import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Croissant, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/register")({ component: RegisterPage });

const schema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(80),
    email: z.string().trim().email("Enter a valid email").max(255),
    phone: z.string().trim().optional(),
    password: z.string().min(8, "Min 8 characters").max(72),
    password_confirm: z.string().min(8, "Confirm your password"),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.password_confirm) {
      ctx.addIssue({
        path: ["password_confirm"],
        code: "custom",
        message: "Passwords do not match",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

function RegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      password_confirm: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      await api.registerCustomer(data);
      toast.success("Registration successful. Please sign in.");
      router.navigate({ to: "/login" });
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || error?.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
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
            Build orders and loyalty for your bakery.
          </h1>
          <p className="text-primary-foreground/80 text-base leading-relaxed">
            Register as a customer and place bakery orders, track deliveries, and access a secure
            account.
          </p>
        </div>
        <div className="relative text-xs text-primary-foreground/70">
          © {new Date().getFullYear()} Sunrise Bakery — MVP
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <Card className="w-full max-w-md p-8 rounded-2xl shadow-sm">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-lg bg-primary grid place-items-center text-primary-foreground">
              <Croissant className="h-5 w-5" />
            </div>
            <span className="font-semibold">BakeryHUB</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Register as a customer to start ordering from your bakery.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" {...register("phone")} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password_confirm">Confirm password</Label>
              <Input id="password_confirm" type="password" {...register("password_confirm")} />
              {errors.password_confirm && (
                <p className="text-xs text-destructive">{errors.password_confirm.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
