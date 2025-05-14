import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Your Firebase configuration object
// Replace with your actual Firebase project details when you have them
const firebaseConfig = {
  apiKey: "demo-waterlogger-api-key",
  authDomain: "demo-waterlogger.firebaseapp.com",
  projectId: "demo-waterlogger",
  storageBucket: "demo-waterlogger.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};

// Initialize Firebase
let app;
let auth;
let db;

// Flag to track if we're using mock Firebase
const usingMockFirebase = isDevelopment;

if (getApps().length === 0) {
  console.log("Initializing Firebase", usingMockFirebase ? "(mock version)" : "");
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Enable offline persistence if not using mock
  if (!usingMockFirebase) {
    enableIndexedDbPersistence(db)
      .catch((err) => {
        console.error("Firestore persistence initialization error:", err);
      });
  }
} else {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
}

// Mock user for development
const MOCK_USER_ID = "dev-user-123456";
let mockUser: User | null = null;

// Sign in anonymously function
export const signInAnonymous = async () => {
  try {
    if (usingMockFirebase) {
      console.log("Using mock Firebase authentication");
      // Create a mock user object that mimics a Firebase User
      mockUser = {
        uid: MOCK_USER_ID,
        isAnonymous: true,
        displayName: null,
        email: null,
        phoneNumber: null,
        photoURL: null,
        providerId: 'anonymous',
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString()
        },
        providerData: [],
        // Add minimal implementations of required methods
        delete: async () => {},
        getIdToken: async () => "mock-token",
        getIdTokenResult: async () => ({ token: "mock-token", claims: {}, expirationTime: "", authTime: "", issuedAtTime: "", signInProvider: "anonymous", signInSecondFactor: null }),
        reload: async () => {},
        toJSON: () => ({}),
        emailVerified: false,
        tenantId: null
      } as unknown as User;
      
      console.log('Created mock user:', mockUser.uid);
      return mockUser;
    }
    
    const userCredential = await signInAnonymously(auth);
    console.log('Signed in anonymously:', userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    throw error;
  }
};

// Custom hook to listen to auth state changes
export const useFirebaseAuth = (callback: (user: User | null) => void) => {
  if (usingMockFirebase && mockUser) {
    // If using mock Firebase, immediately call the callback with our mock user
    setTimeout(() => callback(mockUser), 100);
    return;
  }
  
  onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

// Export Firebase instances
export { app, auth, db, usingMockFirebase, MOCK_USER_ID }; 