import NextAuth, { type NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Always return to /results after any sign-in
      if (url.startsWith(baseUrl)) return `${baseUrl}/results`
      if (url.startsWith('/')) return `${baseUrl}/results`
      return `${baseUrl}/results`
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
