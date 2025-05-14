import { create } from 'zustand';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, auth, usingMockFirebase, MOCK_USER_ID } from './firebase';

// For mock implementation
const mockStorage = new Map<string, WaterLogEntry>();

// Define the water log entry type
export interface WaterLogEntry {
  id?: string;
  userId: string;
  amountCups: number;
  fatigue: number; // 1-5 scale
  timestamp: Timestamp;
}

// Define the store state
interface LogState {
  entries: WaterLogEntry[];
  isLoading: boolean;
  error: string | null;
  fetchEntries: (timespan?: 'day' | 'week' | 'twoweeks' | 'month') => Promise<void>;
  addEntry: (entry: Omit<WaterLogEntry, 'id' | 'userId' | 'timestamp'>) => Promise<string>;
  updateEntry: (id: string, entry: Partial<Omit<WaterLogEntry, 'id' | 'userId'>>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  generateSeedData: () => Promise<void>;
}

// Create the store
export const useLogStore = create<LogState>((set, get) => ({
  entries: [],
  isLoading: false,
  error: null,

  // Fetch entries based on timespan
  fetchEntries: async (timespan = 'week') => {
    const userId = usingMockFirebase ? MOCK_USER_ID : auth.currentUser?.uid;
    
    if (!userId) {
      console.error("No user ID available for fetching entries");
      set({ error: 'User not authenticated' });
      return;
    }

    set({ isLoading: true, error: null });
    console.log(`Fetching entries for timespan: ${timespan}, user: ${userId}`);
    
    try {
      // Calculate the start date based on the timespan
      const now = new Date();
      let startDate = new Date();
      
      switch (timespan) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'twoweeks':
          startDate.setDate(now.getDate() - 14);
          break;
        case 'month':
          startDate.setDate(now.getDate() - 30);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      let fetchedEntries: WaterLogEntry[] = [];
      
      if (usingMockFirebase) {
        // Use the mock storage for development
        console.log("Using mock storage to fetch entries");
        const mockEntries = Array.from(mockStorage.values()).filter(entry => 
          entry.userId === userId && 
          entry.timestamp.toDate() >= startDate
        );
        
        // Sort by timestamp descending
        mockEntries.sort((a, b) => 
          b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime()
        );
        
        fetchedEntries = mockEntries;
        console.log(`Fetched ${fetchedEntries.length} mock entries`);
      } else {
        // Create a Firestore query
        const q = query(
          collection(db, `users/${userId}/logEntries`),
          where('timestamp', '>=', Timestamp.fromDate(startDate)),
          orderBy('timestamp', 'desc')
        );

        // Execute the query
        const querySnapshot = await getDocs(q);
        
        // Process the results
        fetchedEntries = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as Omit<WaterLogEntry, 'id'>
        }));
      }

      set({ entries: fetchedEntries, isLoading: false });
    } catch (err) {
      console.error('Error fetching entries:', err);
      set({ error: 'Failed to fetch entries', isLoading: false });
    }
  },

  // Add a new entry
  addEntry: async (entry) => {
    const userId = usingMockFirebase ? MOCK_USER_ID : auth.currentUser?.uid;
    
    if (!userId) {
      console.error("No user ID available for adding entry");
      set({ error: 'User not authenticated' });
      throw new Error('User not authenticated');
    }

    set({ isLoading: true, error: null });
    try {
      const newEntry = {
        ...entry,
        userId,
        timestamp: Timestamp.now()
      };

      let entryId: string;
      
      if (usingMockFirebase) {
        // Use the mock storage for development
        entryId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        mockStorage.set(entryId, {
          ...newEntry,
          id: entryId
        });
        console.log(`Added mock entry with ID: ${entryId}`);
      } else {
        const docRef = await addDoc(
          collection(db, `users/${userId}/logEntries`), 
          newEntry
        );
        entryId = docRef.id;
      }

      // Update local state
      const entries = [...get().entries];
      entries.unshift({ ...newEntry, id: entryId });
      set({ entries, isLoading: false });
      
      return entryId;
    } catch (err) {
      console.error('Error adding entry:', err);
      set({ error: 'Failed to add entry', isLoading: false });
      throw err;
    }
  },

  // Update an existing entry
  updateEntry: async (id, entry) => {
    const userId = usingMockFirebase ? MOCK_USER_ID : auth.currentUser?.uid;
    
    if (!userId) {
      console.error("No user ID available for updating entry");
      set({ error: 'User not authenticated' });
      throw new Error('User not authenticated');
    }

    set({ isLoading: true, error: null });
    try {
      if (usingMockFirebase) {
        // Use the mock storage for development
        const existingEntry = mockStorage.get(id);
        if (!existingEntry) {
          throw new Error(`Entry with ID ${id} not found`);
        }
        
        mockStorage.set(id, {
          ...existingEntry,
          ...entry
        });
        console.log(`Updated mock entry with ID: ${id}`);
      } else {
        const docRef = doc(db, `users/${userId}/logEntries/${id}`);
        await updateDoc(docRef, entry);
      }

      // Update local state
      const entries = get().entries.map(e => 
        e.id === id ? { ...e, ...entry } : e
      );
      
      set({ entries, isLoading: false });
    } catch (err) {
      console.error('Error updating entry:', err);
      set({ error: 'Failed to update entry', isLoading: false });
      throw err;
    }
  },

  // Delete an entry
  deleteEntry: async (id) => {
    const userId = usingMockFirebase ? MOCK_USER_ID : auth.currentUser?.uid;
    
    if (!userId) {
      console.error("No user ID available for deleting entry");
      set({ error: 'User not authenticated' });
      throw new Error('User not authenticated');
    }

    set({ isLoading: true, error: null });
    try {
      if (usingMockFirebase) {
        // Use the mock storage for development
        if (!mockStorage.has(id)) {
          throw new Error(`Entry with ID ${id} not found`);
        }
        
        mockStorage.delete(id);
        console.log(`Deleted mock entry with ID: ${id}`);
      } else {
        const docRef = doc(db, `users/${userId}/logEntries/${id}`);
        await deleteDoc(docRef);
      }

      // Update local state
      const entries = get().entries.filter(e => e.id !== id);
      set({ entries, isLoading: false });
    } catch (err) {
      console.error('Error deleting entry:', err);
      set({ error: 'Failed to delete entry', isLoading: false });
      throw err;
    }
  },

  // Generate seed data for 30 days
  generateSeedData: async () => {
    const userId = usingMockFirebase ? MOCK_USER_ID : auth.currentUser?.uid;
    
    if (!userId) {
      console.error("No user ID available for generating seed data");
      set({ error: 'User not authenticated' });
      return;
    }

    set({ isLoading: true, error: null });
    console.log(`Generating seed data for user: ${userId}`);
    
    try {
      const now = new Date();
      const entries: Omit<WaterLogEntry, 'id'>[] = [];

      // Generate 30 days of data
      for (let i = 0; i < 30; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Decide how many entries for this day (0-4)
        const entriesPerDay = Math.floor(Math.random() * 5);
        
        for (let j = 0; j < entriesPerDay; j++) {
          // Create a random time during the day
          const hours = Math.floor(Math.random() * 15) + 7; // Between 7am and 10pm
          const minutes = Math.floor(Math.random() * 60);
          
          date.setHours(hours, minutes, 0, 0);
          
          entries.push({
            userId,
            amountCups: parseFloat((Math.random() * 2 + 0.5).toFixed(1)), // 0.5 to 2.5 cups
            fatigue: Math.floor(Math.random() * 5) + 1, // 1-5 scale
            timestamp: Timestamp.fromDate(date)
          });
        }
      }

      console.log(`Generated ${entries.length} sample entries`);

      if (usingMockFirebase) {
        // Store directly in mock storage
        mockStorage.clear(); // Clear existing data
        
        for (const entry of entries) {
          const entryId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          mockStorage.set(entryId, {
            ...entry,
            id: entryId
          });
        }
        
        console.log(`Added ${entries.length} mock entries`);
      } else {
        // Add all entries to Firestore
        const batch = [];
        for (const entry of entries) {
          batch.push(
            addDoc(
              collection(db, `users/${userId}/logEntries`), 
              entry
            )
          );
        }

        await Promise.all(batch);
      }
      
      // Refresh the entries
      await get().fetchEntries('month');
      console.log("Seed data generation complete, entries fetched");
      
      set({ isLoading: false });
    } catch (err) {
      console.error('Error generating seed data:', err);
      set({ error: 'Failed to generate seed data', isLoading: false });
    }
  }
})); 