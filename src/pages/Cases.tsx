import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCases } from "@/hooks/useCases";
import { CreateCaseDialog } from "@/components/cases/CreateCaseDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useHasPermission } from "@/hooks/usePermissions";
import { usePageAccess } from "@/hooks/usePageAccess";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Loader2, FolderOpen } from "lucide-react";

export default function Cases() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const { data: cases, isLoading, error } = useCases(search);
  const navigate = useNavigate();
  const { hasPermission } = useHasPermission();
  const { isLoading: pageLoading, canAccess } = usePageAccess("cases");
  const canCreate = hasPermission("create_case");

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const priorityColors: Record<string, string> = {
    urgent: "bg-destructive/10 text-destructive border-destructive/20",
    high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    low: "bg-muted text-muted-foreground border-border",
  };

  const getPriorityClass = (code?: string) => {
    if (!code) return "bg-muted text-muted-foreground border-border";
    return priorityColors[code.toLowerCase()] || "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الحالات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            إدارة ومتابعة جميع الحالات
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة حالة
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث برقم الحالة أو العنوان..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9"
        />
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-16 text-destructive text-sm">
              حدث خطأ أثناء تحميل الحالات
            </div>
          ) : !cases?.length ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <FolderOpen className="h-10 w-10" />
              <p className="text-sm">لا توجد حالات حاليًا</p>
              {canCreate && (
                <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  إنشاء أول حالة
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-right">رقم الحالة</TableHead>
                    <TableHead className="text-right">العنوان</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">الأولوية</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">القسم</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/cases/${c.id}`)}>
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {c.case_number}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {c.title}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {c.case_type?.name || "—"}
                      </TableCell>
                      <TableCell>
                        {c.priority ? (
                          <Badge variant="outline" className={`text-xs ${getPriorityClass(c.priority.code)}`}>
                            {c.priority.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.status ? (
                          <Badge variant="secondary" className="text-xs">
                            {c.status.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {c.current_department?.name || c.department?.name || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(c.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateCaseDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
