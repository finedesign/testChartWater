import { Timestamp } from 'firebase/firestore';
import { useLogStore, WaterLogEntry } from './logStore';

// Generate random number between min and max (inclusive)
const randomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

// Function to generate random data for the past 30 days
export const seedData = async () => {
  console.log('Seeding data...');
  const today = new Date();
  const addEntry = useLogStore.getState().addEntry;
  
  // Generate data for the past 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    // Skip some days (about 15% of days will have no entries)
    if (Math.random() < 0.15) {
      continue;
    }
    
    // Determine number of entries for the day
    let numEntries: number;
    const r = Math.random();
    
    if (r < 0.15) {
      // 15% chance of having just 1 entry
      numEntries = 1;
    } else {
      // 70-85% chance of having 3-7 entries
      numEntries = randomInt(3, 7);
    }
    
    // Create entries for the day
    for (let j = 0; j < numEntries; j++) {
      // Create random times throughout the day
      const hours = randomInt(7, 22); // Between 7am and 10pm
      const minutes = randomInt(0, 59);
      const seconds = randomInt(0, 59);
      
      const timestamp = new Date(date);
      timestamp.setHours(hours, minutes, seconds);
      
      // Generate entry with random amount (1-3 cups) and random fatigue level (1-5)
      await addEntry({
        amountCups: randomInt(1, 3),
        fatigue: randomInt(1, 5)
      });
    }
  }
  
  console.log('Seed data complete');
};

// Function to check if data needs to be seeded (call this on first anonymous login)
export const checkAndSeedData = async () => {
  const entries = useLogStore.getState().entries;
  if (entries.length === 0) {
    await seedData();
    return true;
  }
  return false;
}; 