import React, { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DATE_PRESETS, DateRange } from '@/hooks/useDateRangeFilter';

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export function DateRangeFilter({ dateRange, onDateRangeChange }: DateRangeFilterProps) {
  const [preset, setPreset] = useState('last7days');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

  const handlePresetChange = (value: string) => {
    setPreset(value);
    if (value !== 'custom') {
      const presetData = DATE_PRESETS[value as keyof typeof DATE_PRESETS];
      if (presetData.getValue) {
        onDateRangeChange(presetData.getValue());
      }
    }
  };

  const handleCustomRangeUpdate = () => {
    if (customStart && customEnd) {
      onDateRangeChange({
        start: customStart,
        end: customEnd,
        label: `${format(customStart, 'MMM d')} - ${format(customEnd, 'MMM d')}`
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="last7days">Last 7 days</SelectItem>
          <SelectItem value="last30days">Last 30 days</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>

      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-32 justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customStart ? format(customStart, 'MMM d') : 'Start'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customStart}
                onSelect={setCustomStart}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-32 justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customEnd ? format(customEnd, 'MMM d') : 'End'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customEnd}
                onSelect={(date) => {
                  setCustomEnd(date);
                  if (date && customStart) {
                    setTimeout(handleCustomRangeUpdate, 100);
                  }
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}