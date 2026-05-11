import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-8 py-6 flex justify-between items-center border-b">
        <div className="font-bold text-xl flex items-center gap-2">
          SHOP Quote
        </div>
        <nav className="flex gap-4">
          <Link href="/pricing" className="text-sm font-medium hover:underline">Pricing</Link>
          <Link href="/dashboard">
            <Button>Login / Dashboard</Button>
          </Link>
        </nav>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <h1 className="text-5xl font-extrabold tracking-tight max-w-3xl mb-6">
          Fast practical quoting for small CNC shops.
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mb-8">
          Create clear, consistent milling and turning quotes without relying on spreadsheets, memory, or a full-time estimator.
        </p>
        <Link href="/dashboard">
          <Button size="lg" className="text-lg px-8">Get Started</Button>
        </Link>
      </main>
    </div>
  );
}
