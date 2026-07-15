import { Button } from "@/components/ui/button";
import StreexLogo from "@/components/StreexLogo";

export default function LegalPage({ type }: { type: "privacy" | "terms" }) {
  const privacy = type === "privacy";
  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground">
      <article className="mx-auto max-w-2xl space-y-7">
        <div className="flex items-center justify-between gap-4">
          <StreexLogo className="h-8" />
          <Button type="button" variant="outline" onClick={() => window.location.assign("/")}>Back to Streex</Button>
        </div>
        <header className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Streex beta</p>
          <h1 className="text-3xl font-bold">{privacy ? "Privacy Notice" : "Terms of Use"}</h1>
          <p className="text-sm text-muted-foreground">Effective July 2026 · Plain-language beta terms for invited testers.</p>
        </header>
        {privacy ? (
          <div className="space-y-5 text-sm leading-7 text-muted-foreground">
            <p>Streex stores the account email you use to sign in and the earnings, shifts, mileage, rides, goals, notes, and settings you choose to enter. The product uses this information only to provide your private tracking and analytics.</p>
            <p>Your earnings data is protected by account-scoped access controls. Streex administrators use limited account and activity summaries for support; they do not have a normal interface for browsing or editing your financial history. If deeper diagnosis is needed, we will ask you to provide an export or explicit permission.</p>
            <p>Streex uses Supabase for authentication and data storage, Vercel for web hosting, and may use carefully scoped service providers for email and optional driver utilities. Do not enter sensitive payment-card, bank, government-ID, or medical information.</p>
            <p>You can export your data from Settings. To request account support or deletion, contact the person who invited you to the beta.</p>
          </div>
        ) : (
          <div className="space-y-5 text-sm leading-7 text-muted-foreground">
            <p>Streex is an early beta personal gig-work tracker. It helps organize user-entered information; it is not tax, legal, employment, financial, navigation, safety, or earnings advice.</p>
            <p>You are responsible for the accuracy of information you enter and for maintaining access to your email account and password. Use the product only with your own account and do not upload confidential information unrelated to tracking gig work.</p>
            <p>Features may change during beta. Some analytics are unavailable when the required data has not been recorded, and estimates or comparisons are never guarantees of future earnings.</p>
            <p>We may restrict an account for security, misuse, or beta-support reasons. You can export your data from Settings before requesting account deletion.</p>
          </div>
        )}
      </article>
    </main>
  );
}
