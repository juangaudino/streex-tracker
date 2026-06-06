import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Lock, LogIn, Mail, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ChangelogDialog from "@/components/ChangelogDialog";
import { CURRENT_VERSION, CHANGELOG, formatVersionLabel } from "@/lib/changelog";
import { AnimatedStreexLogo, StreexMotionBackground } from "@/components/StreexMotionBrand";

interface AuthPageProps {
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
}

export default function AuthPage({ signIn, signUp }: AuthPageProps) {
  const isAdminRoute = window.location.pathname === "/admin";
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || (!isForgot && !password.trim())) return;
    setLoading(true);

    if (isForgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) {
        toast({ title: "Reset failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Password reset email sent. Please check your inbox." });
        setIsForgot(false);
      }
      return;
    }

    const { error } = isSignUp && !isAdminRoute
      ? await signUp(email.trim(), password)
      : await signIn(email.trim(), password);

    setLoading(false);

    if (error) {
      toast({
        title: isSignUp ? "Sign up failed" : "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } else if (isSignUp && !isAdminRoute) {
      toast({ title: "Account created! You're now logged in." });
    }
  }

  return (
    <div className="streex-premium-shell min-h-screen flex items-center justify-center overflow-hidden px-5 py-8 sm:px-6">
      <StreexMotionBackground density="auth" />
      <div className="relative z-10 w-full max-w-sm space-y-6 rounded-[1.35rem] border border-white/10 bg-black/20 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-md sm:p-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <AnimatedStreexLogo variant="auth" />
          </div>
          {isAdminRoute && (
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#E6CE20]">
              Admin Ops
            </p>
          )}
          <p className="text-white/64 text-sm">
            {isForgot
              ? "Reset your password"
              : isAdminRoute
                ? "Authorized internal access only"
                : isSignUp
                  ? "Create your account"
                  : "Sign in to track your earnings"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="relative block">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/48" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 rounded-xl border-white/10 bg-white/[0.055] pl-10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] placeholder:text-white/38 focus-visible:ring-[#E6CE20]/45"
              />
            </label>
            {!isForgot && (
              <label className="relative block">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/48" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  className="h-12 rounded-xl border-white/10 bg-white/[0.055] pl-10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] placeholder:text-white/38 focus-visible:ring-[#E6CE20]/45"
                />
              </label>
            )}
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-[#E6CE20] font-bold text-black shadow-[0_14px_38px_rgba(230,206,32,0.24)] hover:bg-[#f3dc27] focus-visible:ring-[#E6CE20]/45"
            disabled={loading}
          >
            {isForgot ? (
              <><KeyRound className="h-4 w-4 mr-2" /> Send Reset Link</>
            ) : isSignUp ? (
              <><UserPlus className="h-4 w-4 mr-2" /> Sign Up</>
            ) : (
              <><LogIn className="h-4 w-4 mr-2" /> Sign In</>
            )}
          </Button>
        </form>

        <div className="space-y-2 text-center text-sm text-white/56">
          {!isForgot && !isAdminRoute && (
            <p>
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-semibold text-[#E6CE20] transition-colors hover:text-[#fff05a]"
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </p>
          )}
          <p>
            <button
              type="button"
              onClick={() => { setIsForgot(!isForgot); setIsSignUp(false); }}
              className="font-semibold text-[#E6CE20] transition-colors hover:text-[#fff05a]"
            >
              {isForgot ? "Back to sign in" : "Forgot password?"}
            </button>
          </p>
        </div>

        <div className="text-center space-y-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => setChangelogOpen(true)}
            className="font-mono text-[11px] text-white/42 transition-colors hover:text-[#E6CE20]"
          >
            Streex {formatVersionLabel(CURRENT_VERSION)} · view changelog
          </button>
          <div className="space-y-1 text-[10px] leading-relaxed text-white/32">
            {CHANGELOG[0].items.slice(0, 4).map((it, i) => (
              <p key={i}>• {it}</p>
            ))}
          </div>
        </div>
      </div>
      <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
    </div>
  );
}
