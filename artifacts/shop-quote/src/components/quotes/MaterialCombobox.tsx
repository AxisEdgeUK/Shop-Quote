import { useState } from "react";
import { useListMaterials } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { BookOpen } from "lucide-react";

interface MaterialComboboxProps {
  value: string;
  onChange: (value: string, costPerKg?: number) => void;
  placeholder?: string;
}

export function MaterialCombobox({
  value,
  onChange,
  placeholder = "e.g. EN8, 316 SS, 6082 T6",
}: MaterialComboboxProps) {
  const [open, setOpen] = useState(false);
  const { data: materials = [] } = useListMaterials();

  const activeMaterials = materials.filter((m) => m.active);

  const grouped = activeMaterials.reduce<Record<string, typeof activeMaterials>>(
    (acc, m) => {
      if (!acc[m.material]) acc[m.material] = [];
      acc[m.material].push(m);
      return acc;
    },
    {},
  );

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            type="button"
            title={
              activeMaterials.length === 0
                ? "No materials in library — import from the Materials page"
                : "Search material library"
            }
            className="shrink-0"
          >
            <BookOpen className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <Command>
            <CommandInput placeholder="Search materials…" />
            <CommandEmpty>
              {activeMaterials.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground px-4">
                  No materials yet. Import your material list from the{" "}
                  <strong>Materials</strong> page.
                </div>
              ) : (
                "No matching materials found."
              )}
            </CommandEmpty>
            <CommandList className="max-h-72">
              {Object.entries(grouped).map(([matName, items]) => (
                <CommandGroup key={matName} heading={matName}>
                  {items.map((m) => {
                    const display = [m.grade, m.form]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <CommandItem
                        key={m.id}
                        value={`${m.material} ${m.grade} ${m.form}`}
                        onSelect={() => {
                          onChange(
                            display || m.grade,
                            m.costPerKg > 0 ? m.costPerKg : undefined,
                          );
                          setOpen(false);
                        }}
                      >
                        <div className="flex flex-col gap-0.5 py-0.5 w-full">
                          <div className="font-medium text-sm">{display || m.grade}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {m.supplier && <span>{m.supplier}</span>}
                            {m.costPerKg > 0 && (
                              <span className="font-mono">
                                £{m.costPerKg.toFixed(2)}/kg
                              </span>
                            )}
                            {m.density > 0 && (
                              <span>{m.density} g/cm³</span>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
