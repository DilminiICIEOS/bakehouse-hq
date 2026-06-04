/**
 * Connected Password Reset Request User Interface Component
 * file: src/routes/forgot-password.tsx
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Croissant, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

// 🌟 Import your missing API action explicitly by name
import { forgotPassword } from "@/lib/api-backend";

export const Route = createFileRoute("/forgot-password")({ component: Page });

const schema = z.object({ email: z.string().trim().email("Enter a valid email").max(255) });

function Page() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<{ email: string }>({ resolver: zodResolver(schema) });

  // 🌟 THE FIX: Wires the submit handler straight into your backend Axios methods
  const onSubmit = async (data: { email: string }) => {
    try {
      console.log("Triggering password reset flow for email address profile row:", data.email);
      const result = await forgotPassword(data.email);
      
      if (result.success) {
        setSent(true);
        toast.success("Reset verification token successfully generated.");
      } else {
        toast.error("Failed to parse communication credentials.");
      }
    } catch (error: any) {
      console.error("API error encountered during forgot password request:", error);
      toast.error(error.response?.data?.error?.message || "Could not bridge network request connections.");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
      <Card className="w-full max-w-md p-8 rounded-2xl border-slate-100 shadow-xl bg-white">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-lg bg-primary grid place-items-center text-primary-foreground">
            <Croissant className="h-5 w-5" />
          </div>
          <span className="font-bold text-slate-800">BakeryHUB System</span>
        </div>

        {sent ? (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 className="h-10 w-10 mx-auto text-green-600 animate-pulse" />
            <h2 className="text-xl font-bold text-slate-800">Check your inbox</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              We've dispatched a secure single-use cryptographic recovery link to your employee account email.
            </p>
            <Link to="/login" className="inline-flex items-center text-sm text-primary font-bold mt-3">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Reset password</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Enter your account email and we'll send a reset link.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-slate-600">Email Address</Label>
                <Input id="email" type="email" placeholder="cashier@bakery.com" className="bg-slate-50 border-slate-200" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive font-bold">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full h-11 font-bold" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
              </Button>
              <div className="pt-1">
                <Link to="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground font-bold">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back to sign in
                </Link>
              </div>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}