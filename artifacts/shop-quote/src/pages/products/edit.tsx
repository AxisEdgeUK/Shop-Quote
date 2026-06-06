import { useState, useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, type StandardProduct } from "@/lib/api";

const PRODUCT_CATEGORIES = [
  "Spacers",
  "Bushes",
  "Shafts",
  "Plates",
  "Brackets",
  "Assemblies",
  "Fasteners",
  "Other",
];
const UNITS = ["each", "lot", "set", "pair", "m", "kg"];
const LEAD_TIMES = [
  "Ex-stock",
  "1 week",
  "2 weeks",
  "3 weeks",
  "4 weeks",
  "To be confirmed",
];

export function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [productCode, setProductCode] = useState("");
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [material, setMaterial] = useState("");
  const [standardSize, setStandardSize] = useState("");
  const [unit, setUnit] = useState("each");
  const [defaultSellPrice, setDefaultSellPrice] = useState(0);
  const [defaultCost, setDefaultCost] = useState(0);
  const [defaultLeadTime, setDefaultLeadTime] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const { data: product, isLoading } = useQuery<StandardProduct>({
    queryKey: ["products", id],
    queryFn: () => apiFetch<StandardProduct>(`/products/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (product && !loaded) {
      setProductCode(product.productCode);
      setProductName(product.productName);
      setCategory(product.category);
      setMaterial(product.material);
      setStandardSize(product.standardSize);
      setUnit(product.unit);
      setDefaultSellPrice(product.defaultSellPrice);
      setDefaultCost(product.defaultCost);
      setDefaultLeadTime(product.defaultLeadTime);
      setNotes(product.notes);
      setActive(product.active);
      setLoaded(true);
    }
  }, [product, loaded]);

  const update = useMutation({
    mutationFn: () =>
      apiFetch(`/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          productCode,
          productName,
          category,
          material,
          standardSize,
          unit,
          defaultSellPrice,
          defaultCost,
          defaultLeadTime,
          notes,
          active,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product updated" });
      setLocation("/products");
    },
    onError: () =>
      toast({ title: "Failed to update product", variant: "destructive" }),
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
        <Link href="/products">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <Package className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold">Edit Standard Product</h1>
      </div>

      <div className="rounded border p-6 space-y-4" style={cardStyle}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Product Code</Label>
            <Input
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              placeholder="e.g. SP-M8-20"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Product Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. M8 Spacer"
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
              placeholder="e.g. Spacers"
              list="edit-product-categories"
              className="h-10"
            />
            <datalist id="edit-product-categories">
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label>Material</Label>
            <Input
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder="e.g. Aluminium 6082"
              className="h-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Standard Size</Label>
            <Input
              value={standardSize}
              onChange={(e) => setStandardSize(e.target.value)}
              placeholder="e.g. Ø20 × 15mm"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="each"
              list="edit-product-units"
              className="h-10"
            />
            <datalist id="edit-product-units">
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
          <Label>Default Lead Time</Label>
          <Input
            value={defaultLeadTime}
            onChange={(e) => setDefaultLeadTime(e.target.value)}
            placeholder="e.g. 2 weeks"
            list="edit-product-lead-times"
            className="h-10"
          />
          <datalist id="edit-product-lead-times">
            {LEAD_TIMES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
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
        <Link href="/products">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button
          onClick={() => update.mutate()}
          disabled={!productName.trim() || update.isPending}
        >
          {update.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
