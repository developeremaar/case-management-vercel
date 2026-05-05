import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const { currentMembership } = useOrganization();


  return (
    <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground">
          <Menu className="h-5 w-5" />
        </SidebarTrigger>

        {currentMembership && (
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{currentMembership.organization?.name}</span>
            {currentMembership.branch?.name && (
              <>
                <span className="text-border">/</span>
                <span className="text-muted-foreground">{currentMembership.branch.name}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="text-foreground font-medium">{user.full_name}</span>
            {currentMembership && (
              <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                {currentMembership.role?.name || currentMembership.role?.code || "—"}
              </span>
            )}
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={signOut} title="تسجيل الخروج">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
