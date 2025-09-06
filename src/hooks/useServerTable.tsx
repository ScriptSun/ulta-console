import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ServerTableState, ServerTableResponse } from '@/types/tableTypes';

interface UseServerTableOptions<T> {
  queryKey: string[];
  queryFn: (state: ServerTableState) => Promise<ServerTableResponse<T>>;
  initialPageSize?: number;
  debounceMs?: number;
}

export function useServerTable<T>({
  queryKey,
  queryFn,
  initialPageSize = 25,
  debounceMs = 300
}: UseServerTableOptions<T>) {
  const [tableState, setTableState] = useState<ServerTableState>({
    page: 1,
    pageSize: initialPageSize,
    search: '',
    filters: {}
  });

  const [debouncedSearch, setDebouncedSearch] = useState(tableState.search);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(tableState.search);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [tableState.search, debounceMs]);

  // Reset page when search or filters change
  useEffect(() => {
    if (tableState.page !== 1 && (debouncedSearch !== '' || Object.keys(tableState.filters).length > 0)) {
      setTableState(prev => ({ ...prev, page: 1 }));
    }
  }, [debouncedSearch, tableState.filters]);

  const queryState = {
    ...tableState,
    search: debouncedSearch
  };

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery<ServerTableResponse<T>>({
    queryKey: [...queryKey, queryState],
    queryFn: () => queryFn(queryState),
    placeholderData: (previousData) => previousData,
  });

  const updateSearch = useCallback((search: string) => {
    setTableState(prev => ({ ...prev, search }));
  }, []);

  const updateFilters = useCallback((filters: Record<string, any>) => {
    setTableState(prev => ({ ...prev, filters }));
  }, []);

  const updateSort = useCallback((sortBy?: string, sortOrder?: 'asc' | 'desc') => {
    setTableState(prev => ({ ...prev, sortBy, sortOrder }));
  }, []);

  const updatePage = useCallback((page: number) => {
    setTableState(prev => ({ ...prev, page }));
  }, []);

  const updatePageSize = useCallback((pageSize: number) => {
    setTableState(prev => ({ ...prev, pageSize, page: 1 }));
  }, []);

  return {
    data: data?.data ?? [],
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 0,
    currentPage: data?.page ?? 1,
    pageSize: data?.pageSize ?? initialPageSize,
    isLoading,
    error,
    isFetching,
    refetch,
    tableState,
    updateSearch,
    updateFilters,
    updateSort,
    updatePage,
    updatePageSize
  };
}