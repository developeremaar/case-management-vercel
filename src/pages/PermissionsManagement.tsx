import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  useRoles,
  useAllPermissions,
  useRolePermissionIds,
  useGrantRolePermission,
  useRevokeRolePermission,
  type RoleRow,
} from "@/hooks/useRolePermissions";
import { useHasPermission } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Shield,
  ChevronLeft,
  Loader2,
  KeyRound,
  Lock,
} from "lucide-react";
import { usePageAccess } from "@/hooks/usePageAccess";

export default function PermissionsManagement() {
  const { user } = useAuth();
  const { currentMembership } = useOrganization();
  const { data: roles, isLoading: rolesLoading, error: rolesError } = useRoles();
  const [selectedRole, setSelectedRole] = useState<RoleRow | null>(null);
  const { permissionCodes } = useHasPermission();
  const { isLoading: pageLoading, canAccess, requiredPermissionCode, candidatePermissionCodes } = usePageAccess("permissions");

  useEffect(() => {
    if (pageLoading) return;

    console.log("[PermissionsPage] ---");
    console.log("[PermissionsPage] current user id:", user?.id);
    console.log("[PermissionsPage] current membership id:", currentMembership?.id);
    console.log("[PermissionsPage] current role code:", currentMembership?.role?.code);
    console.log("[PermissionsPage] loaded permission codes:", permissionCodes);
    console.log("[PermissionsPage] required permission code:", requiredPermissionCode);
    console.log("[PermissionsPage] candidate permission codes:", candidatePermissionCodes);
    console.log("[PermissionsPage] hasPermission result:", canAccess);
    console.log("[PermissionsPage] ---");
  }, [candidatePermissionCodes, canAccess, currentMembership?.id, currentMembership?.role?.code, pageLoading, permissionCodes, requiredPermissionCode, user?.id]);

  if (rolesError) {
    console.error("[PermissionsManagement] Roles error:", rolesError);
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">لا تملك صلاحية الوصول</h2>
          <p className="text-sm text-muted-foreground">ليس لديك صلاحية إدارة الصلاحيات</p>
        </div>
      </div>
    );
  }

  if (selectedRole) {
    return (
      <RolePermissionsView
        role={selectedRole}
        onBack={() => setSelectedRole(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">إدارة الصلاحيات</h1>
          <p className="text-sm text-muted-foreground">إدارة أدوار النظام وربط الصلاحيات بكل دور</p>
        </div>
      </div>

      {/* Roles List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            الأدوار
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rolesLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rolesError ? (
            <p className="text-center text-destructive p-8">خطأ في جلب الأدوار: {(rolesError as any)?.message || "خطأ غير معروف"}</p>
          ) : !roles?.length ? (
            <p className="text-center text-muted-foreground p-8">لا توجد أدوار لهذه الجهة</p>
          ) : (
            <div className="grid gap-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-right"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{role.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{role.code}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    {role.code}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ============ Role Permissions View ============ */
function RolePermissionsView({
  role,
  onBack,
}: {
  role: RoleRow;
  onBack: () => void;
}) {
  const { data: allPermissions, isLoading: permsLoading } = useAllPermissions();
  const { data: grantedIds, isLoading: grantedLoading } = useRolePermissionIds(role.id);
  const grant = useGrantRolePermission();
  const revoke = useRevokeRolePermission();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const isLoading = permsLoading || grantedLoading;
  const grantedSet = new Set(grantedIds || []);

  const handleToggle = async (permissionId: string, currentlyGranted: boolean) => {
    if (pendingIds.has(permissionId)) return;
    setPendingIds((prev) => new Set(prev).add(permissionId));

    try {
      if (currentlyGranted) {
        await revoke.mutateAsync({ role_id: role.id, permission_id: permissionId });
        toast.success("تم إلغاء الصلاحية");
      } else {
        await grant.mutateAsync({ role_id: role.id, permission_id: permissionId });
        toast.success("تم منح الصلاحية");
      }
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ");
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(permissionId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{role.name}</h2>
            <p className="text-xs text-muted-foreground font-mono">{role.code}</p>
          </div>
        </div>
        <Badge variant="outline">
          {role.code}
        </Badge>
      </div>

      <Separator />

      {/* Permissions */}
      <div className="flex items-center gap-2 mb-2">
        <Lock className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold text-foreground">الصلاحيات</h3>
        {grantedIds && (
          <Badge variant="outline" className="text-xs">
            {grantedIds.length} / {allPermissions?.length || 0}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !allPermissions?.length ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            لا توجد صلاحيات في النظام
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {allPermissions.map((perm) => {
                const isGranted = grantedSet.has(perm.id);
                const isPending = pendingIds.has(perm.id);

                return (
                  <label
                    key={perm.id}
                    className="flex items-center gap-3 p-3 hover:bg-accent/30 transition-colors cursor-pointer"
                  >
                    <Checkbox
                      checked={isGranted}
                      disabled={isPending}
                      onCheckedChange={() => handleToggle(perm.id, isGranted)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {perm.name || perm.code}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">{perm.code}</p>
                    </div>
                    {perm.description && (
                      <p className="text-xs text-muted-foreground max-w-xs truncate hidden sm:block">
                        {perm.description}
                      </p>
                    )}
                    {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
