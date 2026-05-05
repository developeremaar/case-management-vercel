import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import Beneficiaries from "@/pages/Beneficiaries";
import BeneficiaryDetails from "@/pages/BeneficiaryDetails";
import Settings from "@/pages/Settings";
import { Button } from "@/components/ui/button";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OrganizationProvider, useOrganization } from "@/contexts/OrganizationContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import SelectOrganization from "@/pages/SelectOrganization";
import Dashboard from "@/pages/Dashboard";
import Cases from "@/pages/Cases";
import CaseDetails from "@/pages/CaseDetails";
import UsersManagement from "@/pages/UsersManagement";
import PermissionsManagement from "@/pages/PermissionsManagement";
import AcceptInvitation from "@/pages/AcceptInvitation";
import NotFound from "@/pages/NotFound";
import { Loader2, Shield } from "lucide-react";
import { usePageAccess } from "@/hooks/usePageAccess";
import { ReactNode } from "react";
import PlatformOrganizations from "@/pages/PlatformOrganizations";

function ProtectedPage({ code, label, children }: { code: string; label: string; children: ReactNode }) {
  const { isLoading, canAccess } = usePageAccess(code);
  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!canAccess) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-2">
        <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
        <h2 className="text-lg font-semibold text-foreground">لا تملك صلاحية الوصول</h2>
        <p className="text-sm text-muted-foreground">ليس لديك صلاحية عرض {label}</p>
      </div>
    </div>
  );
  return <>{children}</>;
}



function PlatformRoute({ children }: { children: ReactNode }) {
  const { hasPlatformAccess } = useAuth();
  const canAccess = hasPlatformAccess;

  if (!canAccess) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function AppRoutes() {
  const { session, memberships, loading, noMemberships, signOut, hasPlatformAccess } = useAuth();
  const { currentMembership } = useOrganization();

  if (loading) return <LoadingScreen />;

  // Not logged in
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Logged in but no memberships
  if (noMemberships) {
    return (
      <Routes>
        <Route
          path="*"
          element={
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 gap-4">
              <div className="text-center space-y-2">
                <h1 className="text-xl font-bold text-foreground">لا توجد عضويات</h1>
                <p className="text-sm text-muted-foreground">حسابك غير مرتبط بأي جهة. تواصل مع المسؤول لإضافتك.</p>
              </div>
              <Button variant="outline" onClick={signOut}>تسجيل الخروج</Button>
            </div>
          }
        />
      </Routes>
    );
  }

  // Logged in but needs to select organization
  if ((memberships.length > 1 || hasPlatformAccess) && !currentMembership) {
    return (
      <Routes>
        <Route path="/select-organization" element={<SelectOrganization />} />
        <Route path="/platform/organizations" element={<PlatformRoute><PlatformOrganizations /></PlatformRoute>} />
        <Route path="*" element={<Navigate to="/select-organization" replace />} />
      </Routes>
    );
  }

  // Logged in, organization selected (or single membership auto-selected)
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/select-organization" element={<Navigate to="/dashboard" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/:id" element={<CaseDetails />} />
        <Route path="/users" element={<UsersManagement />} />
        <Route path="/permissions" element={<PermissionsManagement />} />
        <Route path="/beneficiaries" element={<Beneficiaries />} />
        <Route path="/beneficiaries/:id" element={<BeneficiaryDetails />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/platform/organizations" element={<PlatformRoute><PlatformOrganizations /></PlatformRoute>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OrganizationProvider>
            <AppRoutes />
          </OrganizationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
