import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Mail, User, Building2, Shield } from "lucide-react";
import { toast } from "sonner";

interface InvitationData {
  id: string;
  full_name: string;
  email: string | null;
  mobile: string | null;
  organization_id: string;
  branch_id: string | null;
  department_id: string | null;
  role_id: string;
  is_primary: boolean | null;
  is_active: boolean | null;
  status: string;
  expires_at: string;
}

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [orgName, setOrgName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [invalidMsg, setInvalidMsg] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setInvalid(true);
      setInvalidMsg("رابط الدعوة غير صالح — لا يوجد رمز دعوة.");
      setLoading(false);
      return;
    }
    fetchInvitation(token);
  }, [token]);

  const fetchInvitation = async (tkn: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from("user_invitations")
        .select("*")
        .eq("invitation_token", tkn)
        .eq("status", "pending")
        .single();

      if (error || !data) {
        setInvalid(true);
        setInvalidMsg("الدعوة غير صالحة أو تم قبولها/إلغاؤها مسبقًا.");
        setLoading(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setInvalid(true);
        setInvalidMsg("انتهت صلاحية هذه الدعوة.");
        setLoading(false);
        return;
      }

      setInvitation(data);

      // Fetch org & role names
      const [orgRes, roleRes] = await Promise.all([
        (supabase as any).from("organizations").select("name").eq("id", data.organization_id).single(),
        (supabase as any).from("roles").select("name").eq("id", data.role_id).single(),
      ]);
      setOrgName(orgRes.data?.name || "—");
      setRoleName(roleRes.data?.name || "—");
    } catch {
      setInvalid(true);
      setInvalidMsg("حدث خطأ أثناء التحقق من الدعوة.");
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    if (password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    if (!invitation.email) {
      toast.error("لا يوجد بريد إلكتروني مرتبط بهذه الدعوة");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create Auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
      });
      if (authError) throw new Error(authError.message);
      const userId = authData.user?.id;
      if (!userId) throw new Error("فشل إنشاء الحساب");

      // 2. Create user record in public.users
      const { error: userError } = await (supabase as any)
        .from("users")
        .insert({
          id: userId,
          full_name: invitation.full_name,
          mobile: invitation.mobile || null,
          is_active: true,
        });
      if (userError) throw new Error("فشل إنشاء سجل المستخدم: " + userError.message);

      // 3. Create membership
      const { error: membershipError } = await (supabase as any)
        .from("memberships")
        .insert({
          user_id: userId,
          organization_id: invitation.organization_id,
          branch_id: invitation.branch_id || null,
          department_id: invitation.department_id || null,
          role_id: invitation.role_id,
          is_primary: invitation.is_primary ?? false,
          is_active: invitation.is_active ?? true,
        });
      if (membershipError) throw new Error("فشل إنشاء العضوية: " + membershipError.message);

      // 4. Update invitation status
      const { error: updateError } = await (supabase as any)
        .from("user_invitations")
        .update({ status: "accepted" })
        .eq("id", invitation.id);
      if (updateError) console.error("Failed to update invitation status:", updateError);

      // Sign out so user logs in fresh
      await supabase.auth.signOut();

      setSuccess(true);
      toast.success("تم إنشاء حسابك بنجاح!");
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء قبول الدعوة");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-2">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-destructive">دعوة غير صالحة</CardTitle>
            <CardDescription>{invalidMsg}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate("/login")}>
              الذهاب لتسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-2">
              <CheckCircle className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-primary">تم قبول الدعوة بنجاح</CardTitle>
            <CardDescription>تم إنشاء حسابك وعضويتك. يمكنك الآن تسجيل الدخول.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/login")}>تسجيل الدخول</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">قبول الدعوة</CardTitle>
          <CardDescription>أكمل بياناتك لإنشاء حسابك</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Invitation details */}
          <div className="space-y-3 mb-6 rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">الاسم:</span>
              <span className="font-medium">{invitation?.full_name}</span>
            </div>
            {invitation?.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">البريد:</span>
                <span className="font-medium">{invitation.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">الجهة:</span>
              <span className="font-medium">{orgName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">الدور:</span>
              <span className="font-medium">{roleName}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="أدخل كلمة المرور"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="أعد إدخال كلمة المرور"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              إنشاء الحساب وقبول الدعوة
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
