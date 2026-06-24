import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc as rawDoc, 
  getDocFromServer as rawGetDocFromServer, 
  disableNetwork as rawDisableNetwork,
  collection as rawCollection,
  onSnapshot as rawOnSnapshot,
  setDoc as rawSetDoc,
  getDoc as rawGetDoc,
  getDocs as rawGetDocs,
  updateDoc as rawUpdateDoc,
  deleteDoc as rawDeleteDoc,
  query as rawQuery,
  where as rawWhere,
  orderBy as rawOrderBy,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
setLogLevel('silent');
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth();

// Disable network immediately if quota was already exceeded in a previous session
if (typeof localStorage !== 'undefined') {
  const quotaTS = localStorage.getItem('laughdry_firebase_quota_exceeded_timestamp');
  if (quotaTS) {
    const elapsed = Date.now() - parseInt(quotaTS, 10);
    if (elapsed < 10800000) {
      console.warn("Disabling firestore network on startup due to active quota exceeded flag.");
      rawDisableNetwork(db).catch(err => console.error("Failed to disable network on startup:", err));
    }
  }
}

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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowercaseMsg = errorMessage.toLowerCase();
  const isQuota = lowercaseMsg.includes('quota') || 
                  lowercaseMsg.includes('resource-exhausted') || 
                  lowercaseMsg.includes('exhausted') ||
                  lowercaseMsg.includes('limit exceeded');

  if (isQuota) {
    setFirebaseQuotaExceeded();
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  if (isQuota) {
    console.warn("Gracefully suppressing throw for quota exhaustion of type:", operationType, "at path:", path);
    return;
  }
  
  throw new Error(JSON.stringify(errInfo));
}

export function sanitizeFirestoreData<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  if (data === null) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeFirestoreData(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    // If it's a Date object, keep it as is or serialize/stringify
    if (data instanceof Date) {
      return data as unknown as T;
    }
    const copy: any = {};
    for (const key of Object.keys(data as any)) {
      const val = (data as any)[key];
      if (val !== undefined) {
        copy[key] = sanitizeFirestoreData(val);
      }
    }
    return copy as T;
  }
  return data;
}

const activeListeners: Set<() => void> = new Set();

export function setFirebaseQuotaExceeded() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('laughdry_firebase_quota_exceeded_timestamp', Date.now().toString());
  }
  console.warn("Firebase quota exceeded, invoking disableNetwork dynamically.");
  rawDisableNetwork(db).catch(err => console.error("Failed to disable network:", err));

  // Stop and unsubscribe all active listeners immediately to halt further requests and logs
  const listenersToStop = Array.from(activeListeners);
  activeListeners.clear();
  listenersToStop.forEach(unsub => {
    try {
      unsub();
    } catch (e) {
      console.warn("Failed to stop listener during quota exhaust", e);
    }
  });

  // Dispatch live data change to fallback to local and notify UI components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('laughdry_data_changed'));
  }
}

export function isFirebaseQuotaExceeded(): boolean {
  if (typeof localStorage === 'undefined') return false;
  const quotaTS = localStorage.getItem('laughdry_firebase_quota_exceeded_timestamp');
  if (quotaTS) {
    const elapsed = Date.now() - parseInt(quotaTS, 10);
    if (elapsed < 10800000) { // 3 hours
      return true;
    } else {
      localStorage.removeItem('laughdry_firebase_quota_exceeded_timestamp');
    }
  }
  return false;
}

export function isOfflineOrQuota(): boolean {
  if (typeof window === 'undefined') return true;
  if (localStorage.getItem('laughdry_firebase_disabled') === 'true') return true;
  if (isFirebaseQuotaExceeded()) return true;
  const uid = auth?.currentUser?.uid || localStorage.getItem('laughdry_firebase_uid') || 'default';
  if (uid === 'default') return true;
  return false;
}

// Proxied Firestore function implementations
export function collection(...args: any[]): any {
  return (rawCollection as any)(...args);
}

export function doc(...args: any[]): any {
  return (rawDoc as any)(...args);
}

export function query(...args: any[]): any {
  return (rawQuery as any)(...args);
}

export function where(...args: any[]): any {
  return (rawWhere as any)(...args);
}

export function orderBy(...args: any[]): any {
  return (rawOrderBy as any)(...args);
}

export async function setDoc(...args: any[]): Promise<any> {
  if (isOfflineOrQuota()) return;
  try {
    return await (rawSetDoc as any)(...args);
  } catch (err: any) {
    const errMsg = (err?.message || '').toLowerCase();
    if (errMsg.includes('quota') || errMsg.includes('resource-exhausted') || errMsg.includes('exhausted') || errMsg.includes('limit exceeded')) {
      setFirebaseQuotaExceeded();
      return; // Return silently to trigger fallback without throwing uncaught exceptions
    }
    throw err;
  }
}

export async function getDoc(...args: any[]): Promise<any> {
  if (isOfflineOrQuota()) return { exists: () => false, data: () => null };
  try {
    return await (rawGetDoc as any)(...args);
  } catch (err: any) {
    const errMsg = (err?.message || '').toLowerCase();
    if (errMsg.includes('quota') || errMsg.includes('resource-exhausted') || errMsg.includes('exhausted') || errMsg.includes('limit exceeded')) {
      setFirebaseQuotaExceeded();
      return { exists: () => false, data: () => null }; // Return default representation on quota
    }
    throw err;
  }
}

export async function getDocs(...args: any[]): Promise<any> {
  if (isOfflineOrQuota()) return { forEach: () => {} };
  try {
    return await (rawGetDocs as any)(...args);
  } catch (err: any) {
    const errMsg = (err?.message || '').toLowerCase();
    if (errMsg.includes('quota') || errMsg.includes('resource-exhausted') || errMsg.includes('exhausted') || errMsg.includes('limit exceeded')) {
      setFirebaseQuotaExceeded();
      return { forEach: () => {} }; // Return empty list representation on quota
    }
    throw err;
  }
}

export async function updateDoc(...args: any[]): Promise<any> {
  if (isOfflineOrQuota()) return;
  try {
    return await (rawUpdateDoc as any)(...args);
  } catch (err: any) {
    const errMsg = (err?.message || '').toLowerCase();
    if (errMsg.includes('quota') || errMsg.includes('resource-exhausted') || errMsg.includes('exhausted') || errMsg.includes('limit exceeded')) {
      setFirebaseQuotaExceeded();
      return; // Suppress and return
    }
    throw err;
  }
}

export async function deleteDoc(...args: any[]): Promise<any> {
  if (isOfflineOrQuota()) return;
  try {
    return await (rawDeleteDoc as any)(...args);
  } catch (err: any) {
    const errMsg = (err?.message || '').toLowerCase();
    if (errMsg.includes('quota') || errMsg.includes('resource-exhausted') || errMsg.includes('exhausted') || errMsg.includes('limit exceeded')) {
      setFirebaseQuotaExceeded();
      return; // Suppress and return
    }
    throw err;
  }
}

export function onSnapshot(...args: any[]): any {
  if (isOfflineOrQuota()) {
    return () => {};
  }
  try {
    const queryRef = args[0];
    
    // Check if the second argument is an observer object
    if (args[1] && typeof args[1] === 'object' && ('next' in args[1] || 'error' in args[1])) {
      const observer = { ...args[1] };
      const originalNext = observer.next;
      const originalError = observer.error;
      
      observer.next = (snapshot: any) => {
        if (originalNext) {
          try {
            originalNext(snapshot);
          } catch (e) {
            console.error("Error in onSnapshot next callback:", e);
          }
        }
      };
      
      observer.error = (error: any) => {
        const errMsg = (error?.message || '').toLowerCase();
        if (errMsg.includes('quota') || errMsg.includes('resource-exhausted') || errMsg.includes('exhausted') || errMsg.includes('limit exceeded')) {
          setFirebaseQuotaExceeded();
        }
        if (originalError) {
          try {
            originalError(error);
          } catch (e) {
            console.error("Error in onSnapshot error callback:", e);
          }
        } else {
          console.error("Unhandled onSnapshot error (observer pattern):", error);
        }
      };
      
      const rawUnsub = rawOnSnapshot(queryRef, observer);
      const trackedUnsub = () => {
        activeListeners.delete(trackedUnsub);
        try {
          rawUnsub();
        } catch (e) {}
      };
      activeListeners.add(trackedUnsub);
      return trackedUnsub;
    }
    
    // Check for standard callbacks: onSnapshot(query, [options,] onNext, onError?)
    let options: any = undefined;
    let onNext: any = undefined;
    let onError: any = undefined;
    
    if (typeof args[1] === 'function') {
      onNext = args[1];
      onError = args[2];
    } else if (typeof args[1] === 'object' && typeof args[2] === 'function') {
      options = args[1];
      onNext = args[2];
      onError = args[3];
    } else {
      return () => {};
    }
    
    const wrappedOnNext = (snapshot: any) => {
      if (onNext) {
        try {
          onNext(snapshot);
        } catch (e) {
          console.error("Error in onSnapshot next callback:", e);
        }
      }
    };
    
    const wrappedOnError = (error: any) => {
      const errMsg = (error?.message || '').toLowerCase();
      if (errMsg.includes('quota') || errMsg.includes('resource-exhausted') || errMsg.includes('exhausted') || errMsg.includes('limit exceeded')) {
        setFirebaseQuotaExceeded();
      }
      if (onError) {
        try {
          onError(error);
        } catch (e) {
          console.error("Error in onSnapshot error callback:", e);
        }
      } else {
        console.error("Unhandled onSnapshot error (callback pattern):", error);
      }
    };
    
    let rawUnsub: () => void;
    if (options !== undefined) {
      rawUnsub = rawOnSnapshot(queryRef, options, wrappedOnNext, wrappedOnError);
    } else {
      rawUnsub = rawOnSnapshot(queryRef, wrappedOnNext, wrappedOnError);
    }
    
    const trackedUnsub = () => {
      activeListeners.delete(trackedUnsub);
      try {
        rawUnsub();
      } catch (e) {}
    };
    activeListeners.add(trackedUnsub);
    return trackedUnsub;
  } catch (err: any) {
    const errMsg = (err?.message || '').toLowerCase();
    if (errMsg.includes('quota') || errMsg.includes('resource-exhausted') || errMsg.includes('exhausted') || errMsg.includes('limit exceeded')) {
      setFirebaseQuotaExceeded();
    }
    return () => {};
  }
}

export { rawDisableNetwork as disableNetwork };
