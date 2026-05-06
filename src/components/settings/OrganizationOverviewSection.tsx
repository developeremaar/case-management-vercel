import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  commercial_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  contact_email: string | null;
  contact_mobile: string | null;
  address: string | null;
  country_code: string | null;
  timezone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function OrganizationOverviewSection({ organization }: { organization: OrganizationRow | null | undefined }) {
  if (!organization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>بيانات الجهة</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          لا يمكن عرض بيانات الجهة في الوقت الحالي.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center justify-between gap-2">
          <span>بيانات الجهة الأساسية</span>
          <Badge variant={organization.is_active ? "default" : "secondary"}>
            {organization.is_active ? "نشطة" : "غير نشطة"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="اسم الجهة" value={organization.name} />
          <Field label="الاسم التجاري" value={organization.commercial_name} />
          <Field label="المعرّف" value={organization.slug} />
          <Field label="البريد الإلكتروني" value={organization.contact_email} />
          <Field label="رقم الجوال" value={organization.contact_mobile} />
          <Field label="الدولة" value={organization.country_code} />
          <Field label="المنطقة الزمنية" value={organization.timezone} />
          <Field label="العنوان" value={organization.address} />
        </div>
        <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
          تعديل بيانات الجهة الأساسية يتطلب تهيئة صلاحيات لاحقة.
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value?.trim() ? value : "—"}</p>
    </div>
  );
}
