import type { DefaultSession, NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { UserRole } from "@open-edu/db";
import { prisma } from "@open-edu/db";
import EmailProvider from "next-auth/providers/email";
import { createOrganization } from "@open-edu/services";

declare module "next-auth" {
  interface Session {
    user: {
      orgId: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    orgId: string;
    role: UserRole;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    session({ session, token }) {
      session.user.orgId = token.orgId;
      session.user.role = token.role;
      return session;
    },
    async jwt({ token, trigger, user }) {
      if (trigger === "signUp") {
        const org = await createOrganization(user.name, user.id);
        token.orgId = org.id;
        token.role = org.membership[0].role;
      } else {
        const userOrg = await prisma.membership.findFirstOrThrow({
          where: { userId: token.sub },
          select: { organizationId: true, role: true },
        });
        token.role = userOrg.role;
        token.orgId = userOrg.organizationId;
      }

      return token;
    },
  },
};
