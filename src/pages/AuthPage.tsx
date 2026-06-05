import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { LogIn, UserPlus, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ChangelogDialog from "@/components/ChangelogDialog";
import { CURRENT_VERSION, CHANGELOG, formatVersionLabel } from "@/lib/changelog";
import streexLogo from "@/assets/streex-logo.png";

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
    <div className={`min-h-screen flex items-center justify-center px-4 ${isAdminRoute ? "bg-muted/30" : "bg-background"}`}>
      <div className={`w-full max-w-sm space-y-6 ${isAdminRoute ? "rounded-2xl border border-border bg-card p-6 shadow-xl" : ""}`}>
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <img
              src={streexLogo}
              alt="Streex"
              className="w-32 sm:w-36 h-auto object-contain select-none"
              draggable={false}
            />
          </div>
          {isAdminRoute && (
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
              Admin Ops
            </p>
          )}
          <p className="text-muted-foreground text-sm">
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
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            {!isForgot && (
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {isForgot ? (
              <><KeyRound className="h-4 w-4 mr-2" /> Send Reset Link</>
            ) : isSignUp ? (
              <><UserPlus className="h-4 w-4 mr-2" /> Sign Up</>
            ) : (
              <><LogIn className="h-4 w-4 mr-2" /> Sign In</>
            )}
          </Button>
        </form>

        <div className="space-y-2 text-center text-sm text-muted-foreground">
          {!isForgot && !isAdminRoute && (
            <p>
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline font-medium"
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </p>
          )}
          <p>
            <button
              type="button"
              onClick={() => { setIsForgot(!isForgot); setIsSignUp(false); }}
              className="text-primary hover:underline font-medium"
            >
              {isForgot ? "Back to sign in" : "Forgot password?"}
            </button>
          </p>
        </div>

        <div className="text-center space-y-2 pt-4 border-t border-border/50">
          <button
            type="button"
            onClick={() => setChangelogOpen(true)}
            className="text-[11px] font-mono text-muted-foreground/60 hover:text-primary transition-colors"
          >
            Streex {formatVersionLabel(CURRENT_VERSION)} · view changelog
          </button>
          <div className="text-[10px] text-muted-foreground/40 space-y-0.5">
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
