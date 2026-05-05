import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

export interface AttachmentRow {
  id: string;
  organization_id: string;
  case_id: string | null;
  beneficiary_id: string | null;
  category: string;
  file_name: string;
  file_ext: string | null;
  mime_type: string | null;
  file_size: number | null;
  bucket_name: string;
  storage_path: string;
  is_private: boolean;
  created_at: string;
}

export function useCaseAttachments(caseId?: string) {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;

  return useQuery<AttachmentRow[]>({
    queryKey: ["attachments", orgId, caseId],
    enabled: !!orgId && !!caseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attachments")
        .select("*")
        .eq("organization_id", orgId!)
        .eq("case_id", caseId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as AttachmentRow[];
    },
  });
}

export async function getAttachmentSignedUrl(bucket: string, path: string) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}
