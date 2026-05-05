import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Phone, CreditCard, MapPin, X, ExternalLink, Loader2 } from "lucide-react";
import { useBeneficiaryStats, type Beneficiary } from "@/hooks/useBeneficiaries";
import { useNavigate } from "react-router-dom";

interface Props {
  beneficiary: Beneficiary;
  onRemove?: () => void;
  showLink?: boolean;
  compact?: boolean;
}

export function BeneficiaryCard({ beneficiary, onRemove, showLink = false, compact = false }: Props) {
  const { data: stats, isLoading: statsLoading } = useBeneficiaryStats(beneficiary.id);
  const navigate = useNavigate();
  const b = beneficiary;

  const formatCurrency = (n?: number) => {
    if (n == null || n === 0) return "—";
    return `${n.toLocaleString("ar-SA")} ريال`;
  };

  return (
    <Card className="bg-accent/20 border-primary/10">
      <CardContent className={compact ? "p-3" : "p-4"}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold">{b.full_name}</p>
                <Badge variant="secondary" className="text-xs">مستفيد</Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {b.mobile}
                </span>
                {b.national_id && (
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    {b.national_id}
                  </span>
                )}
                {b.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {b.city}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {showLink && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => navigate(`/beneficiaries/${b.id}`)}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
            {onRemove && (
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        {!compact && (
          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border/50">
            {statsLoading ? (
              <div className="col-span-3 flex justify-center py-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            ) : stats ? (
              <>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{stats.total_cases}</p>
                  <p className="text-[10px] text-muted-foreground">حالات سابقة</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{formatCurrency(stats.total_approved)}</p>
                  <p className="text-[10px] text-muted-foreground">إجمالي الدعم</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{stats.open_cases}</p>
                  <p className="text-[10px] text-muted-foreground">حالات مفتوحة</p>
                </div>
              </>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
