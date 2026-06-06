import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

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

export function NewExtra() {
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

  const create = useMutation({
    mutationFn: () =>
      apiFetch("/extras", {
        method: "POST",
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
      toast({ title: "Extra created" });
      setLocation("/extras");
    },
    onError: () => toast({ title: "Failed to create extra", variant: "destructive" }),
  });

  const cardStyle = {
    background: "hsl(var(--card))",
    borderColor: "hsl(var(--card-border))",
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/extras">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <PlusCircle className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold">New Chargeable Extra</h1>
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
              list="extra-categories"
              className="h-10"
            />
            <datalist id="extra-categories">
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
              list="extra-units"
              className="h-10"
            />
            <datalist id="extra-units">
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
          onClick={() => create.mutate()}
          disabled={!extraName.trim() || create.isPending}
        >
          {create.isPending ? "Saving…" : "Save Extra"}
        </Button>
      </div>
    </div>
  );
}
