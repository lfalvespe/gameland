import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, deleteUser, reauthenticateWithPopup } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, query, where, or, and, orderBy, limit, onSnapshot, addDoc, serverTimestamp, getDocFromServer, getDocs, startAfter, deleteDoc, arrayUnion, increment, arrayRemove } from 'firebase/firestore';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
if (!firebaseConfig || !firebaseConfig.projectId) {
  throw new Error("Firebase configuration is missing or invalid. Please check firebase-applet-config.json");
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Error handling helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, onError?: (msg: string) => void) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Gracefully handle common race conditions or listing permission shifts
  if (errInfo.error.includes("permission-denied") && operationType === OperationType.LIST && (path === 'messages' || path === 'open_rooms')) {
    console.warn(`Benign permission error during ${path} lookup. Ignoring.`);
    return;
  }
  
  if (onError) {
    let userMessage = "An unexpected database error occurred.";
    const isPermissionDenied = errInfo.error.toLowerCase().includes("permission-denied") || 
                               errInfo.error.toLowerCase().includes("insufficient permissions");
    
    if (isPermissionDenied) {
      userMessage = "You don't have permission to perform this action.";
    } else if (errInfo.error.toLowerCase().includes("quota-exceeded")) {
      userMessage = "Database quota exceeded. Please try again later.";
    } else if (errInfo.error.includes("offline")) {
      userMessage = "You appear to be offline. Check your connection.";
    }
    onError(userMessage);
  }

  throw new Error(JSON.stringify(errInfo));
}

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

export { 
  collection, doc, setDoc, getDoc, updateDoc, query, where, or, and, orderBy, limit, onSnapshot, addDoc, serverTimestamp, getDocs, startAfter, deleteDoc, arrayUnion, increment, arrayRemove,
  signInWithPopup, signOut, onAuthStateChanged, deleteUser, reauthenticateWithPopup
};
