import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RootLayout from "./components/layouts/RootLayout";
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import Tasks from "./pages/Tasks";
import ApiKeys from "./pages/ApiKeys";
import Quotas from "./pages/Quotas";
import Plans from "./pages/Plans";
import Security from "./pages/Security";
import Audit from "./pages/Audit";
import Integrations from "./pages/Integrations";
import TeamManagement from "./pages/TeamManagement";
import AssertionCheck from "./pages/AssertionCheck";
import Scripts from "./pages/Scripts";
import ScriptsTemplates from "./pages/ScriptsTemplates";
import ScriptDetail from "./pages/ScriptDetail";
import ScriptsBatches from "./pages/ScriptsBatches";
import ScriptsSettings from "./pages/ScriptsSettings";
import CommandPolicies from "./pages/CommandPolicies";
import Auth from "./pages/Auth";
import AgentTasks from "./pages/AgentTasks";
import ChatInbox from "./pages/ChatInbox";
import WidgetGuide from "./pages/WidgetGuide";
import SecurityDashboard from "./pages/SecurityDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public route */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <RootLayout>
                  <Dashboard />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <RootLayout>
                  <Dashboard />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/agents" element={
              <ProtectedRoute>
                <RootLayout>
                  <Agents />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/agents/:agentId/tasks" element={
              <ProtectedRoute>
                <RootLayout>
                  <AgentTasks />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/tasks" element={
              <ProtectedRoute>
                <RootLayout>
                  <Tasks />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/api-keys" element={
              <ProtectedRoute>
                <RootLayout>
                  <ApiKeys />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/quotas" element={
              <ProtectedRoute>
                <RootLayout>
                  <Quotas />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/plans" element={
              <ProtectedRoute>
                <RootLayout>
                  <Plans />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/security" element={
              <ProtectedRoute>
                <RootLayout>
                  <Security />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/security/audit" element={
              <ProtectedRoute>
                <RootLayout>
                  <Audit />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/integrations" element={
              <ProtectedRoute>
                <RootLayout>
                  <Integrations />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/team-management" element={
              <ProtectedRoute>
                <RootLayout>
                  <TeamManagement />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/assertion-check" element={
              <ProtectedRoute>
                <RootLayout>
                  <AssertionCheck />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/scripts" element={
              <ProtectedRoute>
                <RootLayout>
                  <Scripts />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/security/command-policies" element={
              <ProtectedRoute>
                <RootLayout>
                  <CommandPolicies />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/scripts/templates" element={
              <ProtectedRoute>
                <RootLayout>
                  <ScriptsTemplates />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/scripts/templates/:id" element={
              <ProtectedRoute>
                <RootLayout>
                  <ScriptDetail />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/scripts/batches" element={
              <ProtectedRoute>
                <RootLayout>
                  <ScriptsBatches />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/scripts/settings" element={
              <ProtectedRoute>
                <RootLayout>
                  <ScriptsSettings />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/chat/inbox" element={
              <ProtectedRoute>
                <RootLayout>
                  <ChatInbox />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/widget-guide" element={
              <ProtectedRoute>
                <RootLayout>
                  <WidgetGuide />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/security/dashboard" element={
              <ProtectedRoute>
                <RootLayout>
                  <SecurityDashboard />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
