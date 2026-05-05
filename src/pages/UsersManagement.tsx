import { useEffect, useState } from "react";
import {
  useUsers,
  useUserMemberships,
  useCreateMembership,
  useUpdateMembership,
  useToggleMembershipActive,
  useLookups,
  type MembershipRow,
} from "@/hooks/useUsers";
import {
  useInvitations,
  useCreateInvitation,
  useCancelInvitation,
  useSendInvitationEmail,
} from "@/hooks/useInvitations";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useHasPermission } from "@/hooks/usePermissions";
import { usePageAccess } from "@/hooks/usePageAccess";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Users,
  Shield,
  Building2,
  GitBranch,
  Briefcase,
  ChevronLeft,
  Plus,
  Loader2,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Mail,
  XCircle,
  Clock,
  Copy,
  RefreshCw,
} from "lucide-react";

export default function UsersManagement() {
  const { user } = useAuth();
  const { currentMembership } = useOrganization();
  const { data: users, isLoading } = useUsers();
  const { data: invitations, isLoading: invLoading } = useInvitations();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const { hasAnyPermission, permissionCodes } = useHasPermission();
  const { isLoading: pageLoading, canAccess, requiredPermissionCode, candidatePermissionCodes } = usePageAccess("users");

  const canInviteUser = hasAnyPermission(["manage_users", "invite_user"]);
  const canManageMemberships = hasAnyPermission(["manage_users", "manage_memberships"]);

  useEffect(() => {
    if (pageLoading) return;

    console.log("[UsersPage] ---");
    console.log("[UsersPage] current user id:", user?.id);
    console.log("[UsersPage] current membership id:", currentMembership?.id);
    console.log("[UsersPage] current role code:", currentMembership?.role?.code);
    console.log("[UsersPage] loaded permission codes:", permissionCodes);
    console.log("[UsersPage] required permission code:", requiredPermissionCode);
    console.log("[UsersPage] candidate permission codes:", candidatePermissionCodes);
    console.log("[UsersPage] hasPermission result:", canAccess);
    console.log("[UsersPage] ---");
  }, [candidatePermissionCodes, canAccess, currentMembership?.id, currentMembership?.role?.code, pageLoading, permissionCodes, requiredPermissionCode, user?.id]);

  // Show loading while permissions are being fetched
  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Access denied only after permissions are fully loaded
  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">لا تملك صلاحية الوصول</h2>
          <p className="text-sm text-muted-foreground">ليس لديك صلاحية عرض المستخدمين</p>
        </div>
      </div>
    );
  }

  const selectedUser = users?.find((u) => u.id === selectedUserId);

  if (selectedUserId && selectedUser) {
    return (
      <UserDetails user={selectedUser} onBack={() => setSelectedUserId(null)} canManageMemberships={canManageMemberships} />
    );
  }

  const pendingInvitations = invitations?.filter((i) => i.status === "pending") || [];
  const otherInvitations = invitations?.filter((i) => i.status !== "pending") || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">إدارة المستخدمين</h1>
            <p className="text-sm text-muted-foreground">عرض وإدارة المستخدمين والدعوات</p>
          </div>
        </div>
        {canInviteUser && (
          <Button onClick={() => setShowInvite(true)} className="gap-1.5">
            <Mail className="h-4 w-4" />
            دعوة مستخدم
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" dir="rtl">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            المستخدمون الحاليون
            {users?.length ? (
              <Badge variant="secondary" className="mr-1 text-xs px-1.5">{users.length}</Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="invitations" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            الدعوات المعلقة
            {pendingInvitations.length > 0 && (
              <Badge variant="secondary" className="mr-1 text-xs px-1.5">{pendingInvitations.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Current Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !users?.length ? (
                <div className="text-center p-12 text-muted-foreground">لا يوجد مستخدمون</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">الجوال</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">العضويات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow
                        key={user.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                              {user.full_name?.charAt(0) || "؟"}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{user.full_name}</p>
                              {user.email && (
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.mobile || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={user.is_active !== false ? "default" : "secondary"}>
                            {user.is_active !== false ? "نشط" : "غير نشط"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.membership_count}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations">
          <InvitationsTable
            invitations={pendingInvitations}
            otherInvitations={otherInvitations}
            isLoading={invLoading}
            canInviteUser={canInviteUser}
          />
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <InviteUserDialog open={showInvite} onClose={() => setShowInvite(false)} />
    </div>
  );
}

/* ============ Invitations Table ============ */
function InvitationsTable({
  invitations,
  otherInvitations,
  isLoading,
  canInviteUser,
}: {
  invitations: any[];
  otherInvitations: any[];
  isLoading: boolean;
  canInviteUser: boolean;
}) {
  const cancelInvitation = useCancelInvitation();
  const sendEmail = useSendInvitationEmail();
  const { roles } = useLookups();
  const rolesMap = new Map((roles.data || []).map((r: any) => [r.id, r.name]));

  const handleCancel = (id: string) => {
    cancelInvitation.mutate(id, {
      onSuccess: () => toast.success("تم إلغاء الدعوة"),
      onError: (e: any) => toast.error(e.message || "حدث خطأ"),
    });
  };

  const statusLabel: Record<string, string> = {
    pending: "معلقة",
    accepted: "مقبولة",
    cancelled: "ملغاة",
    expired: "منتهية",
  };

  const statusVariant = (s: string) => {
    if (s === "pending") return "default" as const;
    if (s === "accepted") return "outline" as const;
    return "secondary" as const;
  };

  const allInvitations = [...invitations, ...otherInvitations];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allInvitations.length) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          لا توجد دعوات
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">البريد</TableHead>
              <TableHead className="text-right">الدور</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">تاريخ الانتهاء</TableHead>
              <TableHead className="text-right min-w-[220px]">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allInvitations.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{inv.full_name}</p>
                    {inv.mobile && (
                      <p className="text-xs text-muted-foreground">{inv.mobile}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{inv.email || "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {rolesMap.get(inv.role_id) || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(inv.status)}>
                    {statusLabel[inv.status] || inv.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(inv.expires_at).toLocaleDateString("ar-SA")}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {inv.status === "pending" && canInviteUser && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => {
                            const url = `${window.location.origin}/accept-invitation?token=${inv.invitation_token}`;
                            navigator.clipboard.writeText(url);
                            toast.success("تم نسخ رابط الدعوة");
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          نسخ الرابط
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs"
                          disabled={sendEmail.isPending}
                          onClick={() => {
                            if (!inv.email) {
                              toast.error("لا يوجد بريد إلكتروني لهذه الدعوة");
                              return;
                            }
                            sendEmail.mutate(
                              { email: inv.email, name: inv.full_name, token: inv.invitation_token },
                              {
                                onSuccess: () => toast.success("تم إرسال الدعوة بنجاح"),
                                onError: (e: any) => toast.error(e.message || "فشل إرسال الدعوة"),
                              }
                            );
                          }}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          إعادة إرسال
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleCancel(inv.id)}
                          disabled={cancelInvitation.isPending}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          إلغاء
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ============ Invite User Dialog ============ */
function InviteUserDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const createInvitation = useCreateInvitation();
  const sendEmail = useSendInvitationEmail();
  const { organizations, branches, departments, roles } = useLookups();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [orgId, setOrgId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");

  const filteredBranches = (branches.data || []).filter((b: any) => b.organization_id === orgId);
  const filteredDepts = (departments.data || []).filter((d: any) => d.organization_id === orgId);
  const filteredRoles = (roles.data || []).filter((r: any) => r.organization_id === orgId);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setMobile("");
    setOrgId("");
    setBranchId("");
    setDeptId("");
    setRoleId("");
    setIsPrimary(false);
    setIsActive(true);
    setNotes("");
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("يرجى إدخال الاسم الكامل");
      return;
    }
    if (!orgId || !roleId) {
      toast.error("يرجى اختيار الجهة والدور");
      return;
    }
    try {
      const result = await createInvitation.mutateAsync({
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        mobile: mobile.trim() || undefined,
        organization_id: orgId,
        role_id: roleId,
        branch_id: branchId || undefined,
        department_id: deptId || undefined,
        is_primary: isPrimary,
        is_active: isActive,
        notes: notes.trim() || undefined,
      });

      // Send email after successful creation
      if (email.trim()) {
        try {
          await sendEmail.mutateAsync({
            email: email.trim(),
            name: fullName.trim(),
            token: result.invitation_token,
          });
          toast.success("تم إنشاء الدعوة وإرسال البريد بنجاح");
        } catch (emailErr: any) {
          toast.warning("تم إنشاء الدعوة لكن فشل إرسال البريد: " + (emailErr.message || "خطأ غير معروف"));
        }
      } else {
        toast.success("تم إنشاء الدعوة بنجاح (بدون بريد إلكتروني)");
      }
      resetForm();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ أثناء إنشاء الدعوة");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            دعوة مستخدم جديد
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Full Name */}
          <div className="space-y-2">
            <Label>الاسم الكامل *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="أدخل الاسم الكامل" />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label>البريد الإلكتروني</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" dir="ltr" />
          </div>

          {/* Mobile */}
          <div className="space-y-2">
            <Label>الجوال</Label>
            <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="05xxxxxxxx" dir="ltr" />
          </div>

          <Separator />

          {/* Organization */}
          <div className="space-y-2">
            <Label>الجهة *</Label>
            <Select value={orgId} onValueChange={(v) => { setOrgId(v); setBranchId(""); setDeptId(""); setRoleId(""); }}>
              <SelectTrigger><SelectValue placeholder="اختر الجهة" /></SelectTrigger>
              <SelectContent>
                {(organizations.data || []).map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Branch */}
          <div className="space-y-2">
            <Label>الفرع</Label>
            <Select value={branchId} onValueChange={setBranchId} disabled={!orgId}>
              <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
              <SelectContent>
                {filteredBranches.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label>القسم</Label>
            <Select value={deptId} onValueChange={setDeptId} disabled={!orgId}>
              <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
              <SelectContent>
                {filteredDepts.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>الدور *</Label>
            <Select value={roleId} onValueChange={setRoleId} disabled={!orgId}>
              <SelectTrigger><SelectValue placeholder="اختر الدور" /></SelectTrigger>
              <SelectContent>
                {filteredRoles.map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Switches */}
          <div className="flex items-center justify-between">
            <Label>عضوية أساسية</Label>
            <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
          </div>
          <div className="flex items-center justify-between">
            <Label>نشطة</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>ملاحظات</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات إضافية..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>إلغاء</Button>
          <Button onClick={handleSave} disabled={createInvitation.isPending} className="gap-1.5">
            {createInvitation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            إرسال الدعوة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ User Details ============ */
function UserDetails({
  user,
  onBack,
  canManageMemberships,
}: {
  user: { id: string; full_name: string; mobile?: string; email?: string; is_active?: boolean };
  onBack: () => void;
  canManageMemberships: boolean;
}) {
  const { data: memberships, isLoading } = useUserMemberships(user.id);
  const [showAddMembership, setShowAddMembership] = useState(false);
  const [editingMembership, setEditingMembership] = useState<MembershipRow | null>(null);
  const toggleActive = useToggleMembershipActive();

  const handleToggle = (m: MembershipRow) => {
    toggleActive.mutate(
      { id: m.id, user_id: user.id, is_active: !m.is_active },
      {
        onSuccess: () => toast.success(m.is_active ? "تم تعطيل العضوية" : "تم تفعيل العضوية"),
        onError: (e: any) => toast.error(e.message || "حدث خطأ"),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
            {user.full_name?.charAt(0) || "؟"}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{user.full_name}</h2>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {user.mobile && <span>{user.mobile}</span>}
              {user.email && <span>{user.email}</span>}
            </div>
          </div>
        </div>
        <Badge variant={user.is_active !== false ? "default" : "secondary"} className="text-xs">
          {user.is_active !== false ? "نشط" : "غير نشط"}
        </Badge>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          العضويات
        </h3>
        {canManageMemberships && (
          <Button size="sm" onClick={() => setShowAddMembership(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            إضافة عضوية
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !memberships?.length ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            لا توجد عضويات لهذا المستخدم
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {memberships.map((m) => (
            <Card key={m.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground">
                      {(m.organization as any)?.name || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.is_primary && (
                      <Badge variant="outline" className="text-xs border-primary/30 text-primary">أساسية</Badge>
                    )}
                    <Badge variant={m.is_active ? "default" : "secondary"} className="text-xs">
                      {m.is_active ? "نشطة" : "غير نشطة"}
                    </Badge>
                    {canManageMemberships && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingMembership(m)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggle(m)} disabled={toggleActive.isPending}>
                          {m.is_active ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <GitBranch className="h-3.5 w-3.5" />
                    <span>{(m.branch as any)?.name || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5" />
                    <span>{(m.department as any)?.name || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" />
                    <span>{(m.role as any)?.name || "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddMembershipDialog open={showAddMembership} userId={user.id} onClose={() => setShowAddMembership(false)} />

      {editingMembership && (
        <EditMembershipDialog open={!!editingMembership} membership={editingMembership} onClose={() => setEditingMembership(null)} />
      )}
    </div>
  );
}

/* ============ Add Membership Dialog ============ */
function AddMembershipDialog({ open, userId, onClose }: { open: boolean; userId: string; onClose: () => void }) {
  const createMembership = useCreateMembership();
  const { organizations, branches, departments, roles } = useLookups();

  const [orgId, setOrgId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const filteredBranches = (branches.data || []).filter((b: any) => b.organization_id === orgId);
  const filteredDepts = (departments.data || []).filter((d: any) => d.organization_id === orgId);
  const filteredRoles = (roles.data || []).filter((r: any) => r.organization_id === orgId);

  const resetForm = () => { setOrgId(""); setBranchId(""); setDeptId(""); setRoleId(""); setIsPrimary(false); setIsActive(true); };

  const handleSave = async () => {
    if (!orgId || !roleId) { toast.error("يرجى اختيار الجهة والدور"); return; }
    try {
      await createMembership.mutateAsync({
        user_id: userId, organization_id: orgId, role_id: roleId,
        branch_id: branchId || undefined, department_id: deptId || undefined,
        is_primary: isPrimary, is_active: isActive,
      });
      toast.success("تم إضافة العضوية بنجاح");
      resetForm(); onClose();
    } catch (e: any) { toast.error(e.message || "حدث خطأ أثناء الإضافة"); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader><DialogTitle>إضافة عضوية</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>الجهة *</Label>
            <Select value={orgId} onValueChange={(v) => { setOrgId(v); setBranchId(""); setDeptId(""); setRoleId(""); }}>
              <SelectTrigger><SelectValue placeholder="اختر الجهة" /></SelectTrigger>
              <SelectContent>{(organizations.data || []).map((o: any) => (<SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الفرع</Label>
            <Select value={branchId} onValueChange={setBranchId} disabled={!orgId}>
              <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
              <SelectContent>{filteredBranches.map((b: any) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>القسم</Label>
            <Select value={deptId} onValueChange={setDeptId} disabled={!orgId}>
              <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
              <SelectContent>{filteredDepts.map((d: any) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الدور *</Label>
            <Select value={roleId} onValueChange={setRoleId} disabled={!orgId}>
              <SelectTrigger><SelectValue placeholder="اختر الدور" /></SelectTrigger>
              <SelectContent>{filteredRoles.map((r: any) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="flex items-center justify-between"><Label>عضوية أساسية</Label><Switch checked={isPrimary} onCheckedChange={setIsPrimary} /></div>
          <div className="flex items-center justify-between"><Label>نشطة</Label><Switch checked={isActive} onCheckedChange={setIsActive} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>إلغاء</Button>
          <Button onClick={handleSave} disabled={createMembership.isPending}>
            {createMembership.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ Edit Membership Dialog ============ */
function EditMembershipDialog({ open, membership, onClose }: { open: boolean; membership: MembershipRow; onClose: () => void }) {
  const updateMembership = useUpdateMembership();
  const { organizations, branches, departments, roles } = useLookups();

  const [orgId, setOrgId] = useState(membership.organization_id);
  const [branchId, setBranchId] = useState(membership.branch_id || "");
  const [deptId, setDeptId] = useState(membership.department_id || "");
  const [roleId, setRoleId] = useState(membership.role_id);
  const [isPrimary, setIsPrimary] = useState(membership.is_primary ?? false);
  const [isActive, setIsActive] = useState(membership.is_active);

  const filteredBranches = (branches.data || []).filter((b: any) => b.organization_id === orgId);
  const filteredDepts = (departments.data || []).filter((d: any) => d.organization_id === orgId);
  const filteredRoles = (roles.data || []).filter((r: any) => r.organization_id === orgId);

  const handleSave = async () => {
    if (!orgId || !roleId) { toast.error("يرجى اختيار الجهة والدور"); return; }
    try {
      await updateMembership.mutateAsync({
        id: membership.id, user_id: membership.user_id,
        organization_id: orgId, role_id: roleId,
        branch_id: branchId || undefined, department_id: deptId || undefined,
        is_primary: isPrimary, is_active: isActive,
      });
      toast.success("تم تحديث العضوية بنجاح"); onClose();
    } catch (e: any) { toast.error(e.message || "حدث خطأ أثناء التحديث"); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader><DialogTitle>تعديل العضوية</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>الجهة *</Label>
            <Select value={orgId} onValueChange={(v) => { setOrgId(v); setBranchId(""); setDeptId(""); setRoleId(""); }}>
              <SelectTrigger><SelectValue placeholder="اختر الجهة" /></SelectTrigger>
              <SelectContent>{(organizations.data || []).map((o: any) => (<SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الفرع</Label>
            <Select value={branchId} onValueChange={setBranchId} disabled={!orgId}>
              <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
              <SelectContent>{filteredBranches.map((b: any) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>القسم</Label>
            <Select value={deptId} onValueChange={setDeptId} disabled={!orgId}>
              <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
              <SelectContent>{filteredDepts.map((d: any) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الدور *</Label>
            <Select value={roleId} onValueChange={setRoleId} disabled={!orgId}>
              <SelectTrigger><SelectValue placeholder="اختر الدور" /></SelectTrigger>
              <SelectContent>{filteredRoles.map((r: any) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="flex items-center justify-between"><Label>عضوية أساسية</Label><Switch checked={isPrimary} onCheckedChange={setIsPrimary} /></div>
          <div className="flex items-center justify-between"><Label>نشطة</Label><Switch checked={isActive} onCheckedChange={setIsActive} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSave} disabled={updateMembership.isPending}>
            {updateMembership.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ التعديلات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
