import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLogStore, WaterLogEntry } from './logStore';
import { auth } from './firebase';

// Type for entry input without id, userId, and timestamp
export type EntryInput = Omit<WaterLogEntry, 'id' | 'userId' | 'timestamp'>;

/**
 * Custom hook to access and manipulate water log entries
 */
export function useEntries(timespan: 'day' | 'week' | 'twoweeks' | 'month' = 'week') {
  const queryClient = useQueryClient();
  const store = useLogStore();
  const userId = auth.currentUser?.uid;

  // Query for fetching entries
  const entriesQuery = useQuery({
    queryKey: ['entries', timespan, userId],
    queryFn: () => {
      if (!userId) {
        throw new Error('User not authenticated');
      }
      return store.fetchEntries(timespan).then(() => store.entries);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation for adding a new entry
  const addEntryMutation = useMutation({
    mutationFn: (entry: EntryInput) => store.addEntry(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });

  // Mutation for updating an entry
  const updateEntryMutation = useMutation({
    mutationFn: ({ id, entry }: { id: string; entry: Partial<EntryInput> }) => 
      store.updateEntry(id, entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });

  // Mutation for deleting an entry
  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) => store.deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });

  // Mutation for generating seed data
  const seedDataMutation = useMutation({
    mutationFn: () => store.generateSeedData(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });

  return {
    // Data and loading states
    entries: entriesQuery.data || [],
    isLoading: entriesQuery.isLoading,
    error: entriesQuery.error || store.error,
    
    // Mutations
    addEntry: addEntryMutation.mutate,
    addEntryAsync: addEntryMutation.mutateAsync,
    updateEntry: updateEntryMutation.mutate,
    updateEntryAsync: updateEntryMutation.mutateAsync,
    deleteEntry: deleteEntryMutation.mutate,
    deleteEntryAsync: deleteEntryMutation.mutateAsync,
    
    // Seed data function
    generateSeedData: seedDataMutation.mutate,
    
    // Refresh function
    refresh: () => queryClient.invalidateQueries({ queryKey: ['entries'] }),
  };
} 