import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, User, Shield, GitBranch, Layers } from "lucide-react";


export default function Dashboard() {
  const { user } = useAuth();
  const { currentMembership } = useOrganization();

  const infoCards = [
    {
      title: "الجهة",
      value: currentMembership?.organization?.name || "—",
      icon: Building2,
      color: "text-primary",
      bg: "bg-accent",
    },
    {
      title: "المستخدم",
      value: user?.full_name || "—",
      icon: User,
      color: "text-primary",
      bg: "bg-accent",
    },
    {
      title: "الدور",
      value: currentMembership?.role?.name || currentMembership?.role?.code || "—",
      icon: Shield,
      color: "text-primary",
      bg: "bg-accent",
    },
    {
      title: "الفرع",
      value: currentMembership?.branch?.name || "غير محدد",
      icon: GitBranch,
      color: "text-primary",
      bg: "bg-accent",
    },
    {
      title: "القسم",
      value: currentMembership?.department?.name || "غير محدد",
      icon: Layers,
      color: "text-primary",
      bg: "bg-accent",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="text-sm text-muted-foreground mt-1">
          مرحبًا {user?.full_name}، هذه نظرة عامة على حسابك
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {infoCards.map((card) => (
          <Card key={card.title} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold text-foreground truncate">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder sections for future content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">آخر الحالات</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">لا توجد حالات حاليًا</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">الإحصائيات</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">سيتم إضافة الإحصائيات لاحقًا</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
