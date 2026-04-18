import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
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
  /** Match auth/landing metaverse: amber selected day, cyan borders, portaled popover class */
  landingChrome?: boolean;
}

/** Styled calendar popover for date of birth (dropdown month/year, ~1920–today). */
const defaultCaptionDropdowns = "flex justify-center gap-2 px-2 pb-1";
const defaultDropdownClass =
  "h-8 cursor-pointer rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm outline-none ring-offset-background hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const landingDropdownClass =
  "h-8 cursor-pointer rounded-md border border-cyan-400/45 bg-background px-2 text-sm text-foreground shadow-sm outline-none ring-offset-background hover:bg-cyan-500/10 focus-visible:ring-2 focus-visible:ring-amber-400/45 focus-visible:ring-offset-2";

export function DateOfBirthPicker({
  id,
  value,
  onChange,
  disabled,
  placeholder = "Choose your date of birth",
  allowClear = true,
  className,
  landingChrome = false,
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

  const landingCalendarClassNames = landingChrome
    ? {
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-amber-500/10 [&:has([aria-selected])]:bg-amber-500/15 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day_selected:
          "!bg-gradient-to-br !from-amber-500 !to-orange-600 !text-[#1a0d04] !shadow-md hover:!from-amber-500 hover:!to-orange-600 hover:!text-[#1a0d04] focus:!from-amber-500 focus:!to-orange-600 focus:!text-[#1a0d04]",
        day_today: "border border-cyan-400/45 bg-cyan-500/12 font-semibold text-amber-900 dark:text-amber-200",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 border-cyan-400/40 bg-transparent p-0 opacity-80 hover:border-amber-400/45 hover:opacity-100 focus-visible:ring-amber-400/45",
        ),
      }
    : {};

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
            landingChrome &&
              "border-cyan-400/40 hover:border-amber-400/45 focus-visible:border-amber-400/50 focus-visible:ring-amber-400/40",
            className
          )}
        >
          <CalendarIcon
            className={cn(
              "mr-2 h-4 w-4 shrink-0",
              landingChrome
                ? "text-amber-500 drop-shadow-[0_0_6px_rgba(251,191,36,0.35)]"
                : "opacity-70",
            )}
            aria-hidden
          />
          <span className="truncate">{selected ? format(selected, "MMMM d, yyyy") : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-auto max-w-[100vw] overflow-x-auto p-0 shadow-lg",
          landingChrome ? "hpc-auth-calendar-popover border bg-popover" : "border-border shadow-lg",
        )}
        align="start"
        sideOffset={4}
      >
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
            caption_dropdowns: defaultCaptionDropdowns,
            dropdown: landingChrome ? landingDropdownClass : defaultDropdownClass,
            dropdown_month: "relative",
            dropdown_year: "relative",
            ...landingCalendarClassNames,
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
