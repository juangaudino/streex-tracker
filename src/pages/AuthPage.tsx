import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Lock, LogIn, Mail, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ChangelogDialog from "@/components/ChangelogDialog";
import { CURRENT_VERSION, CHANGELOG, formatVersionLabel } from "@/lib/changelog";
import { AnimatedStreexLogo, StreexMotionBackground } from "@/components/StreexMotionBrand";
import TurnstileChallenge, { isTurnstileEnabled } from "@/components/TurnstileChallenge";
import type { AuthActionResult } from "@/hooks/useAuth";

interface AuthPageProps {
  signIn: (email: string, password: string, captchaToken?: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string, captchaToken?: string) => Promise<AuthActionResult>;
}

export default function AuthPage({ signIn, signUp }: AuthPageProps) {
  const isAdminRoute = window.location.pathname === "/admin";
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const { toast } = useToast();

  const needsCaptcha = isTurnstileEnabled();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || (!isForgot && !password.trim()) || (needsCaptcha && !captchaToken)) return;
    setLoading(true);

    if (isForgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
        captchaToken: captchaToken ?? undefined,
      });
      setLoading(false);
      if (error) {
        toast({ title: "Reset failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "If this account exists, a password reset email is on its way." });
        setIsForgot(false);
      }
      return;
    }

    const result = isSignUp && !isAdminRoute
      ? await signUp(email.trim(), password, captchaToken ?? undefined)
      : await signIn(email.trim(), password, captchaToken ?? undefined);

    setLoading(false);

    if (result.error) {
      toast({
        title: isSignUp ? "Sign up failed" : "Login failed",
        description: result.error.message,
        variant: "destructive",
      });
    } else if (isSignUp && !isAdminRoute) {
      if (result.emailConfirmationRequired) {
        setConfirmationEmail(email.trim());
      } else {
        toast({ title: "Account created. You're now signed in." });
      }
    }
  }

  async function resendConfirmation() {
    if (!confirmationEmail) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: confirmationEmail,
      options: { emailRedirectTo: window.location.origin },
    });
    setResending(false);
    if (error) {
      toast({ title: "Could not resend confirmation.", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Confirmation email resent." });
  }

  if (confirmationEmail) {
    return (
      <div className="streex-premium-shell min-h-screen flex items-center justify-center overflow-hidden px-5 py-8 sm:px-6">
        <StreexMotionBackground density="auth" />
        <div className="relative z-10 w-full max-w-sm space-y-5 rounded-[1.35rem] border border-white/10 bg-black/20 p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-md">
          <AnimatedStreexLogo variant="auth" />
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">Confirm your email</h1>
            <p className="text-sm leading-relaxed text-white/70">We sent a confirmation link to <span className="font-semibold text-white">{confirmationEmail}</span>. Open it to finish setting up Streex.</p>
          </div>
          <Button type="button" variant="outline" className="w-full border-white/15 bg-white/5 text-white hover:bg-white/10" disabled={resending} onClick={resendConfirmation}>
            {resending ? "Sending…" : "Resend confirmation"}
          </Button>
          <button type="button" className="text-sm font-semibold text-[#E6CE20]" onClick={() => setConfirmationEmail(null)}>Back to sign in</button>
        </div>
      </div>
    );
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
          <p className="text-sm text-white/70">
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
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 rounded-xl border-white/10 bg-white/[0.055] pl-10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] placeholder:text-white/40 focus-visible:ring-[#E6CE20]/50"
              />
            </label>
            {!isForgot && (
              <label className="relative block">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  className="h-12 rounded-xl border-white/10 bg-white/[0.055] pl-10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] placeholder:text-white/40 focus-visible:ring-[#E6CE20]/50"
                />
              </label>
            )}
          {needsCaptcha && <TurnstileChallenge onToken={setCaptchaToken} />}
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-[#E6CE20] font-bold text-black shadow-[0_14px_38px_rgba(230,206,32,0.24)] hover:bg-[#f3dc27] focus-visible:ring-[#E6CE20]/50"
            disabled={loading || (needsCaptcha && !captchaToken)}
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

        <div className="space-y-2 text-center text-sm text-white/70">
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

        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <button
            type="button"
            onClick={() => setChangelogOpen(true)}
            className="font-mono text-[11px] text-white/70 transition-colors hover:text-[#E6CE20]"
          >
            Streex {formatVersionLabel(CURRENT_VERSION)} · view changelog
          </button>
          <div className="space-y-1.5 text-[10px] leading-relaxed text-white/55">
            {CHANGELOG[0].items.slice(0, 4).map((it, i) => (
              <p key={i}>• {it}</p>
            ))}
          </div>
        </div>
        <p className="text-center text-[10px] leading-relaxed text-white/45">
          By continuing, you agree to Streex’s <a className="text-[#E6CE20] hover:underline" href="/terms">Terms</a> and <a className="text-[#E6CE20] hover:underline" href="/privacy">Privacy Notice</a>.
        </p>
      </div>
      <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
    </div>
  );
}
