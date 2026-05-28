/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Offline Local Emulator/Mock replacement for Firebase
// This completely cancels Firebase Cloud Integration and works 100% offline.

export const db = {}; // Mock Firestore DB Object

// Mock GoogleIdentityProvider
export class GoogleAuthProvider {
  static credentialFromResult(result: any) {
    return { accessToken: result?.accessToken || "mock_access_token" };
  }
  addScope(scope: string) {
    return this;
  }
}

export const provider = new GoogleAuthProvider();

// Local active auth listeners
let authCallbacks: {
  onSuccess?: (user: any, token: string) => void;
  onFailure?: () => void;
} = {};

export const auth = {
  get currentUser() {
    const saved = localStorage.getItem("abogabal_mock_user");
    return saved ? JSON.parse(saved) : null;
  }
};

// Test connection returns immediately
export async function testFirestoreConnection() {
  console.log("Local Firestore Connection Verified");
}

// Local Session Auth Listener
export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  authCallbacks = { onSuccess: onAuthSuccess, onFailure: onAuthFailure };
  
  // Instantly trigger success if user exists locally, otherwise failure
  setTimeout(() => {
    const user = auth.currentUser;
    const token = localStorage.getItem("abogabal_mock_token");
    if (user && token) {
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  }, 100);

  // Return unsubscribe dummy
  return () => {
    authCallbacks = {};
  };
};

// Simulation Sign-In helper that works instantly
export const googleSignIn = async (): Promise<{ user: any; accessToken: string } | null> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600));

  const user = {
    uid: "local_user_abogabal",
    email: "gaballpasha@gmail.com",
    displayName: "ABO GABAL",
    photoURL: "https://avatar.iran.liara.ir/public/40", // High-contrast visual mock avatar
    emailVerified: true
  };
  const token = "mock_token_abogabal";

  localStorage.setItem("abogabal_mock_user", JSON.stringify(user));
  localStorage.setItem("abogabal_mock_token", token);

  if (authCallbacks.onSuccess) {
    authCallbacks.onSuccess(user, token);
  }

  return { user, accessToken: token };
};

// Retrieve mock access token
export const getAccessToken = async (): Promise<string | null> => {
  return localStorage.getItem("abogabal_mock_token");
};

// Local Logout helper
export const googleLogout = async () => {
  localStorage.removeItem("abogabal_mock_user");
  localStorage.removeItem("abogabal_mock_token");
  if (authCallbacks.onFailure) {
    authCallbacks.onFailure();
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error("Mock Database operation error:", error, "Type:", operationType, "Path:", path);
  throw error;
}
