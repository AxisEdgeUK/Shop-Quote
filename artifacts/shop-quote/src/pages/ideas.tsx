import { useState } from "react";
import { ArrowLeft, Lightbulb, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  "Quoting",
  "PDF",
  "Materials",
  "Customers",
  "Machines",
  "Other",
] as const;

export function IdeasPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Other");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feature-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, description }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setTitle("");
    setCategory("Other");
    setDescription("");
    setSubmitted(false);
    setError(null);
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" style={{ color: "hsl(213 97% 58%)" }} />
          <h1 className="text-xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            Share an Idea
          </h1>
        </div>
      </div>

      <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
        Tell us what would make AxisEdge better for your shop. All ideas are reviewed.
      </p>

      {/* Card */}
      <div
        className="rounded border"
        style={{
          background: "hsl(var(--card))",
          borderColor: "hsl(var(--card-border))",
        }}
      >
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
            <CheckCircle2 className="w-10 h-10" style={{ color: "hsl(213 97% 58%)" }} />
            <div>
              <p className="font-semibold text-base mb-1">Idea submitted — thank you.</p>
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                We review every submission before the next release.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={reset} className="mt-2">
              Submit another
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g. Add a notes field to the PDF header"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description{" "}
                <span className="text-xs font-normal" style={{ color: "hsl(var(--muted-foreground))" }}>
                  (optional)
                </span>
              </Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="Describe the problem you're trying to solve, or how this would help your workflow…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!title.trim() || submitting}
            >
              {submitting ? "Submitting…" : "Submit Idea"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
