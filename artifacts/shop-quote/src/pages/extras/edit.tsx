import { useState, useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, type ChargeableExtra } from "@/lib/api";

const EXTRA_CATEGORIES = [
  "Delivery",
  "Certificates",
  "Inspection",
  "Surface Treatment",
  "Packaging",
  "Heat Treatment",
  "Other",
];

const UNITS = ["each", "lot", "set", "kg", "m", "hour"];

export function EditExtra() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [extraCode, setExtraCode] = useState("");
  const [extraName, setExtraName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("each");
  const [defaultSellPrice, setDefaultSellPrice] = useState(0);
  const [defaultCost, setDefaultCost] = useState(0);
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const { data: extra, isLoading } = useQuery<ChargeableExtra>({
    queryKey: ["extras", id],
    queryFn: () => apiFetch<ChargeableExtra>(`/extras/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (extra && !loaded) {
      setExtraCode(extra.extraCode);
      setExtraName(extra.extraName);
      setCategory(extra.category);
      setUnit(extra.unit);
      setDefaultSellPrice(extra.defaultSellPrice);
      setDefaultCost(extra.defaultCost);
      setNotes(extra.notes);
      setActive(extra.active);
      setLoaded(true);
    }
  }, [extra, loaded]);

  const update = useMutation({
    mutationFn: () =>
      apiFetch(`/extras/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          extraCode,
          extraName,
          category,
          unit,
          defaultSellPrice,
          defaultCost,
          notes,
          active,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extras"] });
      toast({ title: "Extra updated" });
      setLocation("/extras");
    },
    onError: () =>
      toast({ title: "Failed to update extra", variant: "destructive" }),
  });

  const cardStyle = {
    background: "hsl(var(--card))",
    borderColor: "hsl(var(--card-border))",
  };

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/extras">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <PlusCircle className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold">Edit Chargeable Extra</h1>
      </div>

      <div className="rounded border p-6 space-y-4" style={cardStyle}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Extra Code</Label>
            <Input
              value={extraCode}
              onChange={(e) => setExtraCode(e.target.value)}
              placeholder="e.g. DEL-01"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Extra Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={extraName}
              onChange={(e) => setExtraName(e.target.value)}
              placeholder="e.g. Delivery"
              className="h-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Delivery"
              list="edit-extra-categories"
              className="h-10"
            />
            <datalist id="edit-extra-categories">
              {EXTRA_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="each"
              list="edit-extra-units"
              className="h-10"
            />
            <datalist id="edit-extra-units">
              {UNITS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Default Sell Price (£)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={defaultSellPrice}
              onChange={(e) => setDefaultSellPrice(Number(e.target.value))}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Default Cost (£)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={defaultCost}
              onChange={(e) => setDefaultCost(Number(e.target.value))}
              className="h-10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes visible on the quote..."
            rows={3}
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={active} onCheckedChange={setActive} />
          <Label>Active</Label>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Link href="/extras">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button
          onClick={() => update.mutate()}
          disabled={!extraName.trim() || update.isPending}
        >
          {update.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
