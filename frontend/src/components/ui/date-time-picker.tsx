import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DateTimePickerProps {
  date: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  disabled?: boolean;
  placeholder?: string;
}

const hours = Array.from({ length: 24 }, (_, i) => i);
const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

export function DateTimePicker({ date, onChange, label, disabled, placeholder = "Pick date & time" }: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleDateSelect = (day: Date | undefined) => {
    if (!day) return;
    const current = date || new Date();
    day.setHours(current.getHours(), current.getMinutes(), 0, 0);
    onChange(new Date(day));
  };

  const handleHourChange = (h: string) => {
    const d = date ? new Date(date) : new Date();
    d.setHours(parseInt(h), d.getMinutes(), 0, 0);
    onChange(d);
  };

  const handleMinuteChange = (m: string) => {
    const d = date ? new Date(date) : new Date();
    d.setMinutes(parseInt(m));
    onChange(d);
  };

  return (
    <div className="space-y-1">
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal h-9 text-sm",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {date ? format(date, "MMM d, yyyy  HH:mm") : <span>{placeholder}</span>}
            {date && !disabled && (
              <X
                className="ml-auto h-3.5 w-3.5 opacity-50 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); onChange(null); }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date || undefined}
            onSelect={handleDateSelect}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
          <div className="border-t px-3 py-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Time:</span>
            <Select value={String(date?.getHours() ?? 10)} onValueChange={handleHourChange}>
              <SelectTrigger className="w-[70px] h-8 text-xs">
                <SelectValue placeholder="HH" />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {hours.map(h => (
                  <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground font-bold">:</span>
            <Select value={String(date?.getMinutes() ?? 0)} onValueChange={handleMinuteChange}>
              <SelectTrigger className="w-[70px] h-8 text-xs">
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent>
                {minutes.map(m => (
                  <SelectItem key={m} value={String(m)}>{String(m).padStart(2, "0")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="border-t px-3 py-2 flex justify-end">
            <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
