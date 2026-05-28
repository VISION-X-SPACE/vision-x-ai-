/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Offline mock for Firebase Admin Auth module
export const adminAuth = {
  verifyIdToken: async (token: string) => {
    return {
      uid: "local_user_abogabal",
      email: "gaballpasha@gmail.com"
    };
  }
} as any;
