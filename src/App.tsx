import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import RootLayout from "./components/layouts/RootLayout";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import UserDetail from "./pages/UserDetail";
import UserEdit from "./pages/UserEdit";
import AgentDetail from "./pages/AgentDetail";
import Agents from "./pages/Agents";
import Tasks from "./pages/Tasks";
import ApiKeys from "./pages/ApiKeys";
import SubscriptionPlans from "./pages/SubscriptionPlans";
import Security from "./pages/Security";
import Audit from "./pages/Audit";
import Integrations from "./pages/Integrations";
import AccessControl from "./pages/AccessControl";
import TeamManagement from "./pages/TeamManagement";

import Scripts from "./pages/Scripts";
import ScriptsTemplates from "./pages/ScriptsTemplates";
import ScriptDetail from "./pages/ScriptDetail";
import ScriptsBatches from "./pages/ScriptsBatches";
import ScriptsSettings from "./pages/ScriptsSettings";
import Batches from "./pages/Batches";
import CommandPolicies from "./pages/CommandPolicies";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import AgentTasks from "./pages/AgentTasks";
import ChatInbox from "./pages/ChatInbox";
import WidgetManagement from "./pages/WidgetManagement";
import WidgetEdit from "./pages/WidgetEdit";
import SecurityDashboard from "./pages/SecurityDashboard";
import QAChecklist from "./pages/QAChecklist";
import WidgetDeploymentChecklist from "./pages/WidgetDeploymentChecklist";
import RouterDemo from "./pages/_demo/Router";
import WidgetTest from "./pages/WidgetTest";
import ProfileSettings from "./pages/ProfileSettings";
import SystemSettings from "./pages/SystemSettings";
import ApiLimitsSettings from "./pages/ApiLimitsSettings";
import SecuritySettings from "./pages/SecuritySettings";
import BrandCenter from "./pages/BrandCenter";
import { BrandTheme } from "./pages/BrandTheme";
import EmailBranding from "./pages/EmailBranding";
import EmailTemplateEdit from "./pages/EmailTemplateEdit";
import EventTemplateEdit from "./pages/EventTemplateEdit";
import NotificationSettings from "./pages/NotificationSettings";
import AiSettings from "./pages/AiSettings";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Chat from "./pages/Chat";
import RouterLogs from "./pages/RouterLogs";
import MigrationDashboard from "./pages/MigrationDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
            <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
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
            <Route path="/chat" element={
              <ProtectedRoute>
                <RootLayout>
                  <Chat />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute>
                <RootLayout>
                  <Users />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/users/:userId" element={
              <ProtectedRoute>
                <RootLayout>
                  <UserDetail />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/users/:userId/edit" element={
              <ProtectedRoute>
                <RootLayout>
                  <UserEdit />
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
            <Route path="/agents/:agentId" element={
              <ProtectedRoute>
                <RootLayout>
                  <AgentDetail />
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
            {/* Legacy redirect */}
            <Route path="/plans" element={
              <Navigate to="/subscription-plans" replace />
            } />
            <Route path="/subscription-plans" element={
              <ProtectedRoute>
                <RootLayout>
                  <SubscriptionPlans />
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
            <Route path="/access-control" element={
              <ProtectedRoute>
                <RootLayout>
                  <AccessControl />
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
            <Route path="/batches" element={
              <ProtectedRoute>
                <RootLayout>
                  <Batches />
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
            <Route path="/widget-management" element={
              <ProtectedRoute>
                <RootLayout>
                  <WidgetManagement />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/widget-edit/:widgetId" element={
              <ProtectedRoute>
                <RootLayout>
                  <WidgetEdit />
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
            <Route path="/qa-checklist" element={
              <ProtectedRoute>
                <RootLayout>
                  <QAChecklist />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/deployment-checklist" element={
              <ProtectedRoute>
                <RootLayout>
                  <WidgetDeploymentChecklist />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/_demo/router" element={
              <ProtectedRoute>
                <RootLayout>
                  <RouterDemo />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/widget-test" element={
              <ProtectedRoute>
                <RootLayout>
                  <WidgetTest />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/profile-settings" element={
              <ProtectedRoute>
                <RootLayout>
                  <ProfileSettings />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/system-settings" element={
              <ProtectedRoute>
                <RootLayout>
                  <SystemSettings />
                </RootLayout>
              </ProtectedRoute>
            } />
            {/* Individual system settings pages */}
            <Route path="/system-settings/ai-models" element={
              <ProtectedRoute>
                <RootLayout>
                  <AiSettings />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/system-settings/api-limits" element={
              <ProtectedRoute>
                <RootLayout>
                  <ApiLimitsSettings />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/system-settings/security" element={
              <ProtectedRoute>
                <RootLayout>
                  <SecuritySettings />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/system-settings/notifications" element={
              <ProtectedRoute>
                <RootLayout>
                  <NotificationSettings />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/system-settings/upgrade" element={
              <ProtectedRoute>
                <RootLayout>
                  <SystemSettings />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/system-settings/theme" element={
              <ProtectedRoute>
                <RootLayout>
                  <SystemSettings />
                </RootLayout>
              </ProtectedRoute>
            } />
            {/* Brand routes */}
            <Route path="/system-settings/brand" element={
              <ProtectedRoute>
                <RootLayout>
                  <BrandCenter />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/system-settings/brand/theme" element={
              <ProtectedRoute>
                <RootLayout>
                  <BrandTheme />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/system-settings/brand/email" element={
              <ProtectedRoute>
                <RootLayout>
                  <EmailBranding />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/system-settings/brand/email/edit/:templateId" element={
              <ProtectedRoute>
                <RootLayout>
                  <EmailTemplateEdit />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/system-settings/brand/email/events/edit/:templateId" element={
              <ProtectedRoute>
                <RootLayout>
                  <EventTemplateEdit />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/ai-settings" element={
              <ProtectedRoute>
                <RootLayout>
                  <AiSettings />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/router-logs" element={
              <ProtectedRoute>
                <RootLayout>
                  <RouterLogs />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/migration" element={
              <ProtectedRoute>
                <RootLayout>
                  <MigrationDashboard />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <RootLayout>
                  <Settings />
                </RootLayout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;