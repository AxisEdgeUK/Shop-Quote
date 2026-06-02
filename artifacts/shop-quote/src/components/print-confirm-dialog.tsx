import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckSquare, Square } from "lucide-react";

const CHECKS = [
  "Material and grade are correct",
  "Quantity matches the enquiry",
  "Tolerances and surface finish reviewed",
  "Lead time is achievable",
  "Margin and sell price checked",
];

interface PrintConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PrintConfirmDialog({
  open,
  onConfirm,
  onCancel,
}: PrintConfirmDialogProps) {
  const [checked, setChecked] = useState<boolean[]>(CHECKS.map(() => false));

  function toggle(i: number) {
    setChecked((c) => c.map((v, idx) => (idx === i ? !v : v)));
  }

  function handleConfirm() {
    setChecked(CHECKS.map(() => false));
    onConfirm();
  }

  function handleCancel() {
    setChecked(CHECKS.map(() => false));
    onCancel();
  }

  const allChecked = checked.every(Boolean);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleCancel();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Before generating the PDF</DialogTitle>
          <DialogDescription>
            Tick each item to confirm before sending to the customer.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2.5 py-2">
          {CHECKS.map((label, i) => (
            <li
              key={i}
              className="flex items-center gap-3 cursor-pointer select-none"
              onClick={() => toggle(i)}
            >
              {checked[i] ? (
                <CheckSquare
                  className="w-5 h-5 shrink-0"
                  style={{ color: "#1D8FFF" }}
                />
              ) : (
                <Square
                  className="w-5 h-5 shrink-0"
                  style={{ color: "#CBD5E1" }}
                />
              )}
              <span
                className="text-sm"
                style={{
                  color: checked[i]
                    ? "inherit"
                    : "hsl(var(--muted-foreground))",
                }}
              >
                {label}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={handleCancel}>
            Go back
          </Button>
          <Button onClick={handleConfirm} disabled={!allChecked}>
            Generate PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
