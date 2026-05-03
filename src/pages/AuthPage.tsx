import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { LogIn, UserPlus } from "lucide-react";

interface AuthPageProps {
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
}

export default function AuthPage({ signIn, signUp }: AuthPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);

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
            {isSignUp ? "Create your account" : "Sign in to track your earnings"}
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
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {isSignUp ? (
              <><UserPlus className="h-4 w-4 mr-2" /> Sign Up</>
            ) : (
              <><LogIn className="h-4 w-4 mr-2" /> Sign In</>
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary hover:underline font-medium"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}