import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { LogIn, UserPlus, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AuthPageProps {
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
}

export default function AuthPage({ signIn, signUp }: AuthPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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

    const { error } = isSignUp
      ? await signUp(email.trim(), password)
      : await signIn(email.trim(), password);

    setLoading(false);

    if (error) {
      toast({
        title: isSignUp ? "Sign up failed" : "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } else if (isSignUp) {
      toast({ title: "Account created! You're now logged in." });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary tracking-tight">Streex</h1>
          <p className="text-muted-foreground text-sm">
            {isForgot ? "Reset your password" : isSignUp ? "Create your account" : "Sign in to track your earnings"}
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
          {!isForgot && (
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
          <p className="text-[11px] font-mono text-muted-foreground/60">Streex v5.0.2</p>
          <div className="text-[10px] text-muted-foreground/40 space-y-0.5">
            <p>• Improved emotional dashboard logic</p>
            <p>• Better monthly progression system</p>
            <p>• Enhanced End Day flow</p>
            <p>• Cleaner motivational states</p>
          </div>
        </div>
      </div>
    </div>
  );
}