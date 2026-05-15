import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/app-layout";
import { ErrorBoundary } from "@/components/error-boundary";

import { LandingPage } from "@/pages/landing";
import { PricingPage } from "@/pages/pricing";
import { DashboardPage } from "@/pages/dashboard";
import { CustomersList } from "@/pages/customers";
import { CustomerView } from "@/pages/customers/view";
import { NewCustomer } from "@/pages/customers/new";
import { EditCustomer } from "@/pages/customers/edit";
import { AnalyticsPage } from "@/pages/analytics";
import { MachinesList } from "@/pages/machines";
import { NewMachine } from "@/pages/machines/new";
import { EditMachine } from "@/pages/machines/edit";
import { SettingsPage } from "@/pages/settings";
import { QuotesList } from "@/pages/quotes";
import { NewQuote } from "@/pages/quotes/new";
import { EditQuote } from "@/pages/quotes/edit";
import { ViewQuote } from "@/pages/quotes/view";
import { QuickQuote } from "@/pages/quotes/quick";
import { PresentQuote } from "@/pages/quotes/present";

const queryClient = new QueryClient();

function AppRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/dashboard">
        <AppRoute component={DashboardPage} />
      </Route>
      <Route path="/customers">
        <AppRoute component={CustomersList} />
      </Route>
      <Route path="/customers/new">
        <AppRoute component={NewCustomer} />
      </Route>
      <Route path="/customers/:id/edit">
        <AppRoute component={EditCustomer} />
      </Route>
      <Route path="/customers/:id">
        <AppRoute component={CustomerView} />
      </Route>
      <Route path="/machines">
        <AppRoute component={MachinesList} />
      </Route>
      <Route path="/machines/new">
        <AppRoute component={NewMachine} />
      </Route>
      <Route path="/machines/:id/edit">
        <AppRoute component={EditMachine} />
      </Route>
      <Route path="/analytics">
        <AppRoute component={AnalyticsPage} />
      </Route>
      <Route path="/settings">
        <AppRoute component={SettingsPage} />
      </Route>
      <Route path="/quotes">
        <AppRoute component={QuotesList} />
      </Route>
      <Route path="/quotes/quick">
        <AppRoute component={QuickQuote} />
      </Route>
      <Route path="/quotes/new">
        <AppRoute component={NewQuote} />
      </Route>
      <Route path="/quotes/:id/edit">
        <AppRoute component={EditQuote} />
      </Route>
      <Route path="/quotes/:id/present">
        <AppRoute component={PresentQuote} />
      </Route>
      <Route path="/quotes/:id">
        <AppRoute component={ViewQuote} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
