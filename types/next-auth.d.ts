import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: string;
      initials?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    initials?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    initials?: string;
  }
}
