import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBeneficiaries } from "@/hooks/useBeneficiaries";
import { usePageAccess } from "@/hooks/usePageAccess";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Search, UserCheck, Plus, Eye } from "lucide-react";
import { CreateBeneficiarySheet } from "@/components/beneficiaries/CreateBeneficiarySheet";

export default function Beneficiaries() {
  const [search, setSearch] = useState("");
  const { isLoading: pageLoading, canAccess } = usePageAccess("beneficiaries");
  const { data: beneficiaries, isLoading, error } = useBeneficiaries(search);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (canAccess === false) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <UserCheck className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">لا تملك صلاحية الوصول</h2>
          <p className="text-sm text-muted-foreground">ليس لديك صلاحية عرض المستفيدين</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">المستفيدون</h1>
          <p className="text-sm text-muted-foreground mt-0.5">عرض وإدارة المستفيدين</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة مستفيد
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم أو الجوال أو الهوية..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9"
        />
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-16 text-destructive text-sm">حدث خطأ أثناء تحميل المستفيدين</div>
          ) : !beneficiaries?.length ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <UserCheck className="h-10 w-10" />
              <p className="text-sm">لا يوجد مستفيدون حاليًا</p>
              <Button variant="outline" size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                إضافة أول مستفيد
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">الجوال</TableHead>
                    <TableHead className="text-right">الهوية</TableHead>
                    <TableHead className="text-right">المدينة</TableHead>
                    <TableHead className="text-right">تاريخ الإضافة</TableHead>
                    <TableHead className="text-right w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {beneficiaries.map((b) => (
                    <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/beneficiaries/${b.id}`)}>
                      <TableCell className="font-medium">{b.full_name}</TableCell>
                      <TableCell className="font-mono text-sm">{b.mobile}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.national_id || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.city || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(b.created_at).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateBeneficiarySheet open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}
