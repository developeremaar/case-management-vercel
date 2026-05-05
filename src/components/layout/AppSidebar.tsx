import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  UserCheck,
  Settings,
  Building2,
  ChevronDown,
  Shield,
  Globe,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import logoDark from "@/assets/logo-dark.png";

const mainNav = [
  { title: "لوحة التحكم", url: "/dashboard", icon: LayoutDashboard },
  { title: "الحالات", url: "/cases", icon: FolderOpen },
  { title: "المستخدمون", url: "/users", icon: Users },
  { title: "الصلاحيات", url: "/permissions", icon: Shield },
  { title: "المستفيدون", url: "/beneficiaries", icon: UserCheck },
  { title: "الإعدادات", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, hasPlatformAccess } = useAuth();
  const { currentMembership, clearOrganization } = useOrganization();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");
  const canAccessPlatformManagement = hasPlatformAccess;

  return (
    <Sidebar collapsible="icon" side="right" className="border-l-0 border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={logoDark} alt="شعار المنصة" className="h-8 object-contain" />
          {!collapsed && (
            <span className="text-sm font-bold text-sidebar-foreground truncate">
              إدارة الحالات
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        {/* Organization info */}
        {!collapsed && currentMembership?.organization && (
          <div className="mx-3 mb-2">
            <button
              onClick={clearOrganization}
              className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground text-xs hover:bg-sidebar-accent/80 transition-colors"
            >
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate flex-1 text-right font-medium">
                {currentMembership.organization.name}
              </span>
              <ChevronDown className="h-3 w-3 flex-shrink-0 opacity-50" />
            </button>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-xs px-3">
            القائمة الرئيسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 ml-2" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {canAccessPlatformManagement && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-muted text-xs px-3">
              إدارة المنصة
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/platform/organizations")}>
                    <NavLink
                      to="/platform/organizations"
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <Globe className="h-4 w-4 ml-2" />
                      {!collapsed && <span>الجهات</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton disabled>
                    <span className="text-xs opacity-70">الباقات والاشتراكات (قريبًا)</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton disabled>
                    <span className="text-xs opacity-70">الاستخدام (قريبًا)</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton disabled>
                    <span className="text-xs opacity-70">API الخارجي (قريبًا)</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-primary">
              {user.full_name?.charAt(0) || "م"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {user.full_name}
              </p>
              <p className="text-[10px] text-sidebar-muted truncate">{user.email}</p>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
