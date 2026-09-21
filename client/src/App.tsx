import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import DesignSystem from "./pages/DesignSystem";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <Switch>
      <Route path="/design-system" component={DesignSystem} />
      <Route path="/404" component={NotFound} />
      <Route component={Home} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </ErrorBoundary>
  );
}
