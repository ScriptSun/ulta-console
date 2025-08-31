import { useState } from 'react';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export const DATE_PRESETS = {
  today: {
    label: 'Today',
    getValue: () => ({
      start: startOfDay(new Date()),
      end: endOfDay(new Date()),
      label: 'Today'
    })
  },
  last7days: {
    label: 'Last 7 days',
    getValue: () => ({
      start: startOfDay(subDays(new Date(), 6)),
      end: endOfDay(new Date()),
      label: 'Last 7 days'
    })
  },
  last30days: {
    label: 'Last 30 days',
    getValue: () => ({
      start: startOfDay(subDays(new Date(), 29)),
      end: endOfDay(new Date()),
      label: 'Last 30 days'
    })
  },
  custom: {
    label: 'Custom range',
    getValue: null
  }
} as const;

export function useDateRangeFilter() {
  const [dateRange, setDateRange] = useState<DateRange>(DATE_PRESETS.last7days.getValue());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const updateDateRange = (range: DateRange) => {
    setDateRange(range);
    setLastUpdated(new Date());
  };

  return {
    dateRange,
    setDateRange: updateDateRange,
    lastUpdated
  };
}