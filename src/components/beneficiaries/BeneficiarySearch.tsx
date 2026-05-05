import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, User, Phone, CreditCard, Loader2 } from "lucide-react";
import { useSearchBeneficiaries, type Beneficiary } from "@/hooks/useBeneficiaries";

interface Props {
  onSelect: (b: Beneficiary) => void;
  onCreateNew: () => void;
  selectedId?: string;
}

export function BeneficiarySearch({ onSelect, onCreateNew, selectedId }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Beneficiary[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchFn = useSearchBeneficiaries();

  const handleSearch = useCallback(async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      const data = await searchFn(value);
      setResults(data);
    } finally {
      setSearching(false);
    }
  }, [searchFn]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم / رقم الهوية / الجوال..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onCreateNew} className="gap-1.5 whitespace-nowrap">
          <Plus className="h-3.5 w-3.5" />
          مستفيد جديد
        </Button>
      </div>

      {searching && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      )}

      {!searching && hasSearched && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-3">
          لا توجد نتائج. يمكنك إضافة مستفيد جديد.
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {results.map((b) => (
            <Card
              key={b.id}
              className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                selectedId === b.id ? "ring-2 ring-primary bg-accent/30" : ""
              }`}
              onClick={() => {
                onSelect(b);
                setQuery("");
                setResults([]);
                setHasSearched(false);
              }}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{b.full_name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                    {b.city && <span>{b.city}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
