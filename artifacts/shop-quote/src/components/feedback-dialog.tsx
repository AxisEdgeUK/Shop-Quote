import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2 } from "lucide-react";

type Option = "yes" | "no" | "maybe" | "somewhat" | "";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RADIO_OPTIONS: { value: Option; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "somewhat", label: "Somewhat" },
  { value: "no", label: "No" },
];

const LIKELY_OPTIONS: { value: Option; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
];

function RadioGroup({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: Option;
  options: { value: Option; label: string }[];
  onChange: (v: Option) => void;
}) {
  return (
    <div className="flex gap-3">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-1.5 cursor-pointer text-sm"
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="accent-[#1D8FFF]"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [form, setForm] = useState({
    workedWell: "",
    feltSlow: "",
    wasConfusing: "",
    quoteAccurate: "" as Option,
    wouldUseAgain: "" as Option,
    wouldPay: "" as Option,
    notes: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  function set(key: keyof typeof form, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus("done");
    } catch {
      setStatus("idle");
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      setTimeout(() => {
        setForm({
          workedWell: "",
          feltSlow: "",
          wasConfusing: "",
          quoteAccurate: "",
          wouldUseAgain: "",
          wouldPay: "",
          notes: "",
        });
        setStatus("idle");
      }, 300);
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Help us improve AxisEdge Quote. This is a beta — your input shapes
            the product.
          </DialogDescription>
        </DialogHeader>

        {status === "done" ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
            <p className="font-semibold">Thank you for your feedback!</p>
            <p className="text-sm text-muted-foreground">
              It goes directly to the team.
            </p>
            <Button onClick={() => handleClose(false)} className="mt-2">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 pt-1">
            <div className="space-y-1.5">
              <Label>What worked well?</Label>
              <Textarea
                rows={2}
                placeholder="e.g. Wizard flow, PDF layout…"
                value={form.workedWell}
                onChange={(e) => set("workedWell", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>What felt slow or clunky?</Label>
              <Textarea
                rows={2}
                placeholder="e.g. Too many steps, slow to load…"
                value={form.feltSlow}
                onChange={(e) => set("feltSlow", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>What was confusing?</Label>
              <Textarea
                rows={2}
                placeholder="e.g. Margin vs markup, line item pricing…"
                value={form.wasConfusing}
                onChange={(e) => set("wasConfusing", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Did the quote feel accurate?</Label>
              <RadioGroup
                name="quoteAccurate"
                value={form.quoteAccurate}
                options={RADIO_OPTIONS}
                onChange={(v) => set("quoteAccurate", v)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Would you use this again?</Label>
              <RadioGroup
                name="wouldUseAgain"
                value={form.wouldUseAgain}
                options={LIKELY_OPTIONS}
                onChange={(v) => set("wouldUseAgain", v)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Would you pay £999 lifetime or £92.50/month for this?
              </Label>
              <RadioGroup
                name="wouldPay"
                value={form.wouldPay}
                options={LIKELY_OPTIONS}
                onChange={(v) => set("wouldPay", v)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Any other notes?</Label>
              <Textarea
                rows={3}
                placeholder="Anything else…"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={status === "submitting"}>
                {status === "submitting" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send Feedback"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
