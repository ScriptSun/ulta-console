import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import RootLayout from "./components/layouts/RootLayout";
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import Tasks from "./pages/Tasks";
import ApiKeys from "./pages/ApiKeys";
import Quotas from "./pages/Quotas";
import Plans from "./pages/Plans";
import Security from "./pages/Security";
import Integrations from "./pages/Integrations";
import AssertionCheck from "./pages/AssertionCheck";
import Scripts from "./pages/Scripts";
import ScriptsAllowlist from "./pages/ScriptsAllowlist";
import AllowlistCommands from "./pages/AllowlistCommands";
import AllowlistBatches from "./pages/AllowlistBatches";
import ScriptsTemplates from "./pages/ScriptsTemplates";
import ScriptDetail from "./pages/ScriptDetail";
import ScriptsBatches from "./pages/ScriptsBatches";
import ScriptsSettings from "./pages/ScriptsSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RootLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/api-keys" element={<ApiKeys />} />
            <Route path="/quotas" element={<Quotas />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/security" element={<Security />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/assertion-check" element={<AssertionCheck />} />
            <Route path="/scripts" element={<Scripts />} />
            <Route path="/scripts/allowlist" element={<ScriptsAllowlist />} />
            <Route path="/scripts/allowlist/commands" element={<AllowlistCommands />} />
            <Route path="/scripts/allowlist/batches" element={<AllowlistBatches />} />
            <Route path="/scripts/templates" element={<ScriptsTemplates />} />
            <Route path="/scripts/templates/:id" element={<ScriptDetail />} />
            <Route path="/scripts/batches" element={<ScriptsBatches />} />
            <Route path="/scripts/settings" element={<ScriptsSettings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RootLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
