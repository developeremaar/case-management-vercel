import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";

interface Branch { id:string; name:string; code:string|null; city:string|null; address:string|null; contact_mobile:string|null; is_active:boolean; }
interface Department { id:string; name:string; code:string|null; description:string|null; branch_id:string|null; is_active:boolean; }

export function BranchesDepartmentsSection({ orgId, branches, departments }: { orgId: string; branches: Branch[]; departments: Department[] }) {
  const qc = useQueryClient();
  const [branchOpen, setBranchOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [branchForm, setBranchForm] = useState({ name: "", code: "", city: "", address: "", contact_mobile: "" });
  const [deptForm, setDeptForm] = useState({ name: "", code: "", description: "", branch_id: "none" });

  const refresh = () => { qc.invalidateQueries({ queryKey: ["branches", orgId] }); qc.invalidateQueries({ queryKey: ["org_departments", orgId] }); };

  const saveBranch = useMutation({ mutationFn: async () => {
    if (!branchForm.name.trim()) throw new Error("اسم الفرع مطلوب");
    if (editingBranch) {
      const payload = { name: branchForm.name, code: branchForm.code || null, city: branchForm.city || null, address: branchForm.address || null, contact_mobile: branchForm.contact_mobile || null };
      const { error } = await supabase.from("branches").update(payload).eq("id", editingBranch.id);
      if (error) throw error;
    } else {
      const payload = { organization_id: orgId, name: branchForm.name, code: branchForm.code || null, city: branchForm.city || null, address: branchForm.address || null, contact_mobile: branchForm.contact_mobile || null, is_active: true };
      const { error } = await supabase.from("branches").insert(payload);
      if (error) throw error;
    }
  }, onSuccess:()=>{refresh();setBranchOpen(false);toast.success("تم حفظ الفرع");}, onError:(e:any)=>toast.error(e.message)});

  const toggleBranch = useMutation({ mutationFn: async (row: Branch) => {
    const payload = { is_active: !row.is_active };
    const { error } = await supabase.from("branches").update(payload).eq("id", row.id);
    if (error) throw error;
  }, onSuccess: refresh, onError: (e:any)=>toast.error(e.message) });

  const saveDept = useMutation({ mutationFn: async () => {
    if (!deptForm.name.trim()) throw new Error("اسم القسم مطلوب");
    const selectedBranch = deptForm.branch_id === "none" ? null : deptForm.branch_id;
    if (editingDept) {
      const payload = { name: deptForm.name, code: deptForm.code || null, description: deptForm.description || null, branch_id: selectedBranch };
      const { error } = await supabase.from("departments").update(payload).eq("id", editingDept.id);
      if (error) throw error;
    } else {
      const payload = { organization_id: orgId, name: deptForm.name, code: deptForm.code || null, description: deptForm.description || null, branch_id: selectedBranch, is_active: true };
      const { error } = await supabase.from("departments").insert(payload);
      if (error) throw error;
    }
  }, onSuccess:()=>{refresh();setDeptOpen(false);toast.success("تم حفظ القسم");}, onError:(e:any)=>toast.error(e.message)});

  const toggleDept = useMutation({ mutationFn: async (row: Department) => {
    const payload = { is_active: !row.is_active };
    const { error } = await supabase.from("departments").update(payload).eq("id", row.id);
    if (error) throw error;
  }, onSuccess: refresh, onError: (e:any)=>toast.error(e.message) });

  return <div className="space-y-6">
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>الفروع</CardTitle><Button size="sm" onClick={()=>{setEditingBranch(null);setBranchForm({name:"",code:"",city:"",address:"",contact_mobile:""});setBranchOpen(true);}}><Plus className="h-4 w-4 ml-1"/>إضافة فرع</Button></CardHeader><CardContent>
      <Table><TableHeader><TableRow><TableHead>الاسم</TableHead><TableHead>الكود</TableHead><TableHead>المدينة</TableHead><TableHead>الحالة</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader><TableBody>{branches.map((b)=><TableRow key={b.id}><TableCell>{b.name}</TableCell><TableCell>{b.code||"—"}</TableCell><TableCell>{b.city||"—"}</TableCell><TableCell>{b.is_active?"نشط":"معطل"}</TableCell><TableCell className="space-x-2 space-x-reverse"><Button variant="outline" size="sm" onClick={()=>{setEditingBranch(b);setBranchForm({name:b.name,code:b.code||"",city:b.city||"",address:b.address||"",contact_mobile:b.contact_mobile||""});setBranchOpen(true);}}><Pencil className="h-4 w-4"/></Button><Button variant="outline" size="sm" onClick={()=>toggleBranch.mutate(b)}>{b.is_active?"تعطيل":"تفعيل"}</Button></TableCell></TableRow>)}</TableBody></Table>
    </CardContent></Card>

    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>الأقسام</CardTitle><Button size="sm" onClick={()=>{setEditingDept(null);setDeptForm({name:"",code:"",description:"",branch_id:"none"});setDeptOpen(true);}}><Plus className="h-4 w-4 ml-1"/>إضافة قسم</Button></CardHeader><CardContent>
      <Table><TableHeader><TableRow><TableHead>الاسم</TableHead><TableHead>الكود</TableHead><TableHead>الفرع</TableHead><TableHead>الحالة</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader><TableBody>{departments.map((d)=><TableRow key={d.id}><TableCell>{d.name}</TableCell><TableCell>{d.code||"—"}</TableCell><TableCell>{branches.find((b)=>b.id===d.branch_id)?.name || "غير مرتبط"}</TableCell><TableCell>{d.is_active?"نشط":"معطل"}</TableCell><TableCell className="space-x-2 space-x-reverse"><Button variant="outline" size="sm" onClick={()=>{setEditingDept(d);setDeptForm({name:d.name,code:d.code||"",description:d.description||"",branch_id:d.branch_id||"none"});setDeptOpen(true);}}><Pencil className="h-4 w-4"/></Button><Button variant="outline" size="sm" onClick={()=>toggleDept.mutate(d)}>{d.is_active?"تعطيل":"تفعيل"}</Button></TableCell></TableRow>)}</TableBody></Table>
    </CardContent></Card>

    <Dialog open={branchOpen} onOpenChange={setBranchOpen}><DialogContent dir="rtl"><DialogHeader><DialogTitle>{editingBranch?"تعديل فرع":"إضافة فرع"}</DialogTitle></DialogHeader><div className="grid gap-3"><Label>اسم الفرع</Label><Input value={branchForm.name} onChange={(e)=>setBranchForm({...branchForm,name:e.target.value})}/><Label>الكود</Label><Input value={branchForm.code} onChange={(e)=>setBranchForm({...branchForm,code:e.target.value})}/><Label>المدينة</Label><Input value={branchForm.city} onChange={(e)=>setBranchForm({...branchForm,city:e.target.value})}/><Label>العنوان</Label><Input value={branchForm.address} onChange={(e)=>setBranchForm({...branchForm,address:e.target.value})}/><Label>جوال التواصل</Label><Input value={branchForm.contact_mobile} onChange={(e)=>setBranchForm({...branchForm,contact_mobile:e.target.value})}/></div><DialogFooter><Button onClick={()=>saveBranch.mutate()} disabled={saveBranch.isPending}>حفظ</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={deptOpen} onOpenChange={setDeptOpen}><DialogContent dir="rtl"><DialogHeader><DialogTitle>{editingDept?"تعديل قسم":"إضافة قسم"}</DialogTitle></DialogHeader><div className="grid gap-3"><Label>اسم القسم</Label><Input value={deptForm.name} onChange={(e)=>setDeptForm({...deptForm,name:e.target.value})}/><Label>الكود</Label><Input value={deptForm.code} onChange={(e)=>setDeptForm({...deptForm,code:e.target.value})}/><Label>الوصف</Label><Input value={deptForm.description} onChange={(e)=>setDeptForm({...deptForm,description:e.target.value})}/><Label>الفرع (اختياري)</Label><Select value={deptForm.branch_id} onValueChange={(v)=>setDeptForm({...deptForm,branch_id:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">غير مرتبط</SelectItem>{branches.map((b)=><SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button onClick={()=>saveDept.mutate()} disabled={saveDept.isPending}>حفظ</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
