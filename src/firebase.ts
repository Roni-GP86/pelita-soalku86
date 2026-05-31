import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom DB instance ID if it is provided and non-empty
const config = firebaseConfig as any;
export const db =
  config.firestoreDatabaseId && config.firestoreDatabaseId.trim() !== ""
    ? getFirestore(app, config.firestoreDatabaseId)
    : getFirestore(app);

// Custom Firestore Operation Types for audit logs
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

/**
 * Handles Firestore errors by wrapping them into a JSON representation that can be audited.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: "anonymous",
      email: "anonymous@pelitasoal.id",
    },
    operationType,
    path,
  };
  console.error("Firestore Error Audit:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
