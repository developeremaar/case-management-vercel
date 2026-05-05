import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCaseAttachments, getAttachmentSignedUrl } from "@/hooks/useAttachments";
import { Loader2, Paperclip, Download } from "lucide-react";
import { toast } from "sonner";

export function AttachmentsPanel({ caseId }: { caseId: string }) {
  const { data, isLoading, error } = useCaseAttachments(caseId);

  const handleOpen = async (bucket: string, path: string) => {
    try {
      const url = await getAttachmentSignedUrl(bucket, path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("تعذر فتح المرفق");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-primary" />
          مرفقات الحالة
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div> : null}
        {error ? <p className="text-sm text-destructive">تعذر تحميل المرفقات</p> : null}
        {!isLoading && !error && (!data || data.length === 0) ? <p className="text-sm text-muted-foreground">لا توجد مرفقات لهذه الحالة</p> : null}
        <div className="space-y-2">
          {data?.map((a) => (
            <div key={a.id} className="flex items-center justify-between border rounded-md p-2">
              <div>
                <p className="text-sm font-medium">{a.file_name}</p>
                <p className="text-xs text-muted-foreground">{a.category} {a.file_size ? `• ${Math.round(a.file_size / 1024)} KB` : ""}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleOpen(a.bucket_name, a.storage_path)} className="gap-1">
                <Download className="h-3.5 w-3.5" /> تحميل
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
