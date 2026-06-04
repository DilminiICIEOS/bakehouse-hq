/**
 * Role-Based Access Control Complete Password Recovery Landing Screen
 * Captures verification tokens via TanStack query engines and updates backend records.
 * file: src/routes/reset-password.tsx
 */

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Croissant, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// Import your network client function reference hooks
import { resetPasswordConfirm } from "@/lib/api-backend";

// 🌟 THE TRICK: Define search validation schemas to pull query params out of clicked URLs safely
const searchSchema = z.object({
  uid: z.string().default(""),
  token: z.string().default(""),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search) => searchSchema.parse(search),
  component: Page,
});

const formSchema = z.object({
  password: z.string().min(6, "Your new secure password must contain at least 6 characters"),
  passwordConfirm: z.string()
}).refine((data) => data.password === data.passwordConfirm, {
  message: "The confirmation password entry values do not match",
  path: ["passwordConfirm"],
});

type FormFields = z.infer<typeof formSchema>;

function Page() {
  const router = useRouter();
  const { uid, token } = Route.useSearch(); // Automatically reads link values
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = 
    useForm<FormFields>({ resolver: zodResolver(formSchema) });

  const onSubmit = async (data: FormFields) => {
    if (!uid || !token) {
      toast.error("Malformed authentication link configuration values.");
      return;
    }

    try {
      const result = await resetPasswordConfirm({
        uid: uid,
        token: token,
        password: data.password,
      });

      if (result.success) {
        setSuccess(true);
        toast.success("Password updated successfully.");
      } else {
        toast.error(result.error?.message || "Verification validation rejected by authority servers.");
      }
    } catch (error: any) {
      console.error("Confirmation error:", error);
      toast.error(error.response?.data?.error?.message || "Connection to system authority nodes disrupted.");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
      <Card className="w-full max-w-md p-8 rounded-2xl border-slate-100 shadow-xl bg-white">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-lg bg-slate-900 grid place-items-center text-white">
            <Croissant className="h-5 w-5" />
          </div>
          <span className="font-bold text-slate-800">BakeryHUB Management OS</span>
        </div>

        {(!uid || !token) ? (
          <div className="text-center space-y-3 py-4">
            <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
            <h2 className="text-xl font-bold text-slate-800">Invalid link structure</h2>
            <p className="text-sm text-slate-500 font-medium">
              This recovery link is incomplete or broken. Please re-trigger an alternative transaction loop request.
            </p>
            <Link to="/forgot-password" className="inline-block mt-4 text-sm font-bold text-primary hover:underline">
              Request a new security token link
            </Link>
          </div>
        ) : success ? (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 className="h-10 w-10 mx-auto text-green-600 animate-bounce" />
            <h2 className="text-xl font-bold text-slate-800">Credentials updated</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Your new account security password has been compiled and saved. You can now log into your workstation dashboard safely.
            </p>
            <Button className="w-full h-11 font-bold mt-4 text-white" onClick={() => router.navigate({ to: "/login" })}>
              Proceed to account sign in
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Configure new password</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Provide a fresh set of secure validation keys to complete account data remediation.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold text-slate-600">New Password</Label>
                <Input id="password" type="password" placeholder="••••••••" className="bg-slate-50 border-slate-200" {...register("password")} />
                {errors.password && <p className="text-xs text-destructive font-bold">{errors.password.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="passwordConfirm" className="text-xs font-bold text-slate-600">Confirm New Password</Label>
                <Input id="passwordConfirm" type="password" placeholder="••••••••" className="bg-slate-50 border-slate-200" {...register("passwordConfirm")} />
                {errors.passwordConfirm && <p className="text-xs text-destructive font-bold">{errors.passwordConfirm.message}</p>}
              </div>

              <Button type="submit" className="w-full h-11 font-bold" disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Updating credentials...</span>
                  </div>
                ) : (
                  "Commit password update"
                )}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}