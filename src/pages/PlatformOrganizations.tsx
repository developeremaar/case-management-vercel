import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type OrganizationRow = {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
  memberships: { id: string }[] | null;
};

export default function PlatformOrganizations() {
  const queryClient = useQueryClient();
  const { isPlatformOwner } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["platform-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, logo_url, created_at, memberships(id)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as OrganizationRow[];
    },
  });

  const organizations = useMemo(() => data || [], [data]);

  const handleCreate = async () => {
    if (!name.trim()) return;

    try {
      setIsSaving(true);
      const payload: { name: string; logo_url: string | null } = {
        name: name.trim(),
        logo_url: logoUrl.trim() ? logoUrl.trim() : null,
      };

      const { error } = await supabase.from("organizations").insert(payload);

      if (error) throw error;

      setName("");
      setLogoUrl("");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["platform-organizations"] });
      toast.success("تمت إضافة الجهة بنجاح");
    } catch (err) {
      console.error("Failed to create organization", err);
      toast.error("تعذر حفظ الجهة. تأكد من الصلاحيات ثم حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">إدارة الجهات</h1>
          <p className="text-sm text-muted-foreground mt-1">عرض الجهات المتاحة ضمن نطاق صلاحيات المنصة الحالية.</p>
        </div>

        {isPlatformOwner && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                إضافة جهة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>إضافة جهة جديدة</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">اسم الجهة</Label>
                  <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-logo">رابط الشعار (اختياري)</Label>
                  <Input id="org-logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={isSaving || !name.trim()}>
                  {isSaving ? "جارٍ الحفظ..." : "حفظ الجهة"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">قائمة الجهات</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري تحميل الجهات...
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">تعذر تحميل الجهات.</p>
          ) : organizations.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد جهات ظاهرة ضمن صلاحيات هذا الحساب.</p>
          ) : (
            <div className="space-y-3">
              {organizations.map((org) => (
                <div key={org.id} className="rounded-lg border border-border p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{org.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        تاريخ الإنشاء: {new Date(org.created_at).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-4">
                    <Badge variant="secondary">نشطة</Badge>
                    <span className="text-xs text-muted-foreground">
                      عدد العضويات: {org.memberships?.length || 0}
                    </span>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/settings?organization=${org.id}`}>عرض / إدارة</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
