import { useState, useEffect, useRef } from "react";
import { useUpdateQuote, getGetQuoteQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PenLine, Check, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

/**
 * Internal-only estimator notes, shown in the "Job File" pane beneath the
 * drawing. Notes are held client-side until a draft quote exists, then flushed
 * and auto-saved (debounced) to `internalNotes`. Never shown on the customer PDF.
 */
export function EstimatorNotes({
  quoteId,
  initialNotes = "",
}: {
  quoteId?: number;
  initialNotes?: string;
}) {
  const [value, setValue] = useState(initialNotes);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const updateQuote = useUpdateQuote();
  const queryClient = useQueryClient();
  const lastSavedRef = useRef<string>(initialNotes);
  const hydratedRef = useRef(false);

  // Adopt server notes once when they first arrive (edit flow).
  useEffect(() => {
    if (hydratedRef.current) return;
    if (initialNotes) {
      setValue(initialNotes);
      lastSavedRef.current = initialNotes;
    }
    if (quoteId) hydratedRef.current = true;
  }, [initialNotes, quoteId]);

  // Debounced auto-save; flushes pending notes the moment a quoteId appears.
  useEffect(() => {
    if (!quoteId) return;
    if (value === lastSavedRef.current) return;
    setStatus("saving");
    const t = setTimeout(() => {
      updateQuote.mutate(
        { id: quoteId, data: { internalNotes: value } as never },
        {
          onSuccess: () => {
            lastSavedRef.current = value;
            queryClient.invalidateQueries({ queryKey: getGetQuoteQueryKey(quoteId) });
            setStatus("saved");
            setTimeout(() => setStatus("idle"), 2000);
          },
          onError: () => setStatus("idle"),
        },
      );
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, quoteId]);

  return (
    <div
      className="flex flex-col shrink-0"
      style={{
        borderTop: "1px solid #30363D",
        background: "#0D1117",
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <PenLine className="w-3.5 h-3.5" style={{ color: "#8B949E" }} />
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "#8B949E" }}
        >
          Estimator Notes
        </span>
        <span className="text-[10px]" style={{ color: "#6E7681" }}>
          internal · not on PDF
        </span>
        <span className="ml-auto flex items-center gap-1 text-[10px]" style={{ color: "#6E7681" }}>
          {status === "saving" && <Loader2 className="w-3 h-3 animate-spin" />}
          {status === "saved" && <Check className="w-3 h-3" style={{ color: "#3FB950" }} />}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Material stock, fixturing ideas, risk flags, tool list, questions for the customer…"
        className="resize-none border-0 rounded-none text-sm focus-visible:ring-0"
        style={{ background: "transparent", color: "#E6EDF3", minHeight: 96 }}
      />
    </div>
  );
}
