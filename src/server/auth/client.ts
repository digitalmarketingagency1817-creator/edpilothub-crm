import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // baseURL is auto-detected in Next.js
});

// Export commonly used hooks/methods
export const { signIn, signUp, signOut, useSession } = authClient;
