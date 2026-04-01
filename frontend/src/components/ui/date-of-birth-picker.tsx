import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function parseYmd(value: string): Date | undefined {
  const t = value?.trim();
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return undefined;
  const [y, m, d] = t.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return undefined;
  return dt;
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface DateOfBirthPickerProps {
  id?: string;
  /** ISO date YYYY-MM-DD or empty */
  value: string;
  onChange: (ymd: string) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
}

/** Styled calendar popover for date of birth (dropdown month/year, ~1920–today). */
export function DateOfBirthPicker({
  id,
  value,
  onChange,
  disabled,
  placeholder = "Choose your date of birth",
  allowClear = true,
  className,
}: DateOfBirthPickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = React.useMemo(() => parseYmd(value), [value]);

  const fromDate = React.useMemo(() => new Date(1920, 0, 1), []);
  const toDate = React.useMemo(() => {
    const t = new Date();
    t.setHours(23, 59, 59, 999);
    return t;
  }, []);

  const defaultMonth = selected ?? new Date(2000, 0, 1);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" aria-hidden />
          <span className="truncate">{selected ? format(selected, "MMMM d, yyyy") : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[100vw] overflow-x-auto border-border p-0 shadow-lg" align="start" sideOffset={4}>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (!d) return;
            onChange(toYmd(d));
            setOpen(false);
          }}
          defaultMonth={defaultMonth}
          captionLayout="dropdown"
          fromDate={fromDate}
          toDate={toDate}
          initialFocus
          className="pointer-events-auto rounded-lg"
          classNames={{
            caption_dropdowns: "flex justify-center gap-2 px-2 pb-1",
            dropdown:
              "h-8 cursor-pointer rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm outline-none ring-offset-background hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            dropdown_month: "relative",
            dropdown_year: "relative",
          }}
        />
        {allowClear && selected ? (
          <div className="flex justify-end border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
