import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Croissant, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({ component: Page });

const schema = z.object({ email: z.string().trim().email("Enter a valid email").max(255) });

function Page() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<{ email: string }>({ resolver: zodResolver(schema) });

  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 500));
    setSent(true);
    toast.success("Reset link sent");
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <Card className="w-full max-w-md p-8 rounded-2xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-lg bg-primary grid place-items-center text-primary-foreground">
            <Croissant className="h-5 w-5" />
          </div>
          <span className="font-semibold">Sunrise Bakery OS</span>
        </div>

        {sent ? (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 className="h-10 w-10 mx-auto text-chart-4" />
            <h2 className="text-xl font-semibold">Check your inbox</h2>
            <p className="text-sm text-muted-foreground">
              We've sent a password reset link to your email if an account exists.
            </p>
            <Link to="/login" className="inline-flex items-center text-sm text-primary mt-3">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-semibold tracking-tight">Reset password</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your account email and we'll send a reset link.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                Send reset link
              </Button>
              <Link to="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to sign in
              </Link>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
