import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Demo Adventurer",
      credentials: {
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        const name = String(credentials?.name ?? "").trim();
        if (!name) return null;
        return { id: `demo-${name}`, name };
      },
    }),
  ],
  session: { strategy: "jwt" },
});
