import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function PricingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-8 py-6 flex justify-between items-center border-b">
        <Link href="/" className="font-bold text-xl flex items-center gap-2">
          SHOP Quote
        </Link>
        <nav className="flex gap-4">
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </nav>
      </header>
      <main className="flex-1 py-20 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-xl text-muted-foreground mb-12">Choose the plan that works for your shop.</p>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="border rounded-lg p-8 bg-card text-card-foreground shadow-sm">
              <h3 className="text-2xl font-bold mb-2">Monthly Plan</h3>
              <div className="text-4xl font-extrabold mb-6">£92.50<span className="text-lg text-muted-foreground font-normal">/month</span></div>
              <ul className="text-left space-y-3 mb-8">
                <li>✓ Unlimited quotes</li>
                <li>✓ Unlimited customers</li>
                <li>✓ Unlimited machines</li>
                <li>✓ PDF exports</li>
                <li>✓ Email support</li>
              </ul>
              <Button className="w-full">Start Monthly</Button>
            </div>
            
            <div className="border rounded-lg p-8 bg-primary text-primary-foreground shadow-md relative">
              <div className="absolute top-0 right-0 bg-accent text-accent-foreground px-3 py-1 text-xs font-bold rounded-bl-lg rounded-tr-lg">POPULAR</div>
              <h3 className="text-2xl font-bold mb-2">Lifetime License</h3>
              <div className="text-4xl font-extrabold mb-6">£999<span className="text-lg opacity-80 font-normal"> one-off</span></div>
              <ul className="text-left space-y-3 mb-8">
                <li>✓ All monthly features</li>
                <li>✓ Pay once, use forever</li>
                <li>✓ Priority support</li>
                <li>✓ Future updates included</li>
              </ul>
              <Button variant="secondary" className="w-full">Buy Lifetime</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
