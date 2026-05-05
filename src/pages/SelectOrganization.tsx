import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ChevronLeft, Globe, LogOut } from "lucide-react";
import type { Membership } from "@/types/database";
import logoLight from "@/assets/logo-light.png";
import { useNavigate } from "react-router-dom";

export default function SelectOrganization() {
  const { memberships, user, signOut, hasPlatformAccess } = useAuth();
  const navigate = useNavigate();
  const { setCurrentMembership } = useOrganization();

  const handleSelect = (membership: Membership) => {
    setCurrentMembership(membership);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10 space-y-6">
        <div className="text-center space-y-3">
          <img src={logoLight} alt="شعار المنصة" className="h-12 mx-auto object-contain" />
          <h1 className="text-2xl font-bold text-foreground">اختر الجهة</h1>
          <p className="text-sm text-muted-foreground">
            مرحبًا {user?.full_name}، اختر الجهة التي تريد الدخول إليها
          </p>
        </div>

        <div className="space-y-3">
          {hasPlatformAccess && (
            <Card
              role="button"
              tabIndex={0}
              className="cursor-pointer border-primary/40 bg-primary/5 hover:shadow-md transition-all duration-200 group"
              onClick={() => navigate("/platform/organizations")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate("/platform/organizations");
                }
              }}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">دخول إدارة المنصة</h3>
                  <p className="text-xs text-muted-foreground mt-1">الوصول إلى لوحة إدارة الجهات على مستوى المنصة</p>
                </div>
                <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          )}

          {memberships.map((membership) => (
            <Card
              key={membership.id}
              className="cursor-pointer border-border/50 hover:border-primary/40 hover:shadow-md transition-all duration-200 group"
              onClick={() => handleSelect(membership)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                  {membership.organization?.logo_url ? (
                    <img
                      src={membership.organization.logo_url}
                      alt={membership.organization.name}
                      className="w-8 h-8 object-contain"
                    />
                  ) : (
                    <Building2 className="h-6 w-6 text-primary" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {membership.organization?.name || "جهة غير معروفة"}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      {membership.role?.name || membership.role?.code || "—"}
                    </span>
                    {membership.branch?.name && (
                      <span>• {membership.branch.name}</span>
                    )}
                    {membership.department?.name && (
                      <span>• {membership.department.name}</span>
                    )}
                  </div>
                </div>

                <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
            <LogOut className="h-4 w-4 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
      </div>
    </div>
  );
}
