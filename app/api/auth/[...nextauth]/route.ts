import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email și parola sunt necesare")
        }

        try {
          const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password)
          const user = userCredential.user

          if (user) {
            return {
              id: user.uid,
              email: user.email,
              name: user.displayName || user.email?.split("@")[0] || "Utilizator",
              image: user.photoURL,
              uid: user.uid,
            }
          }

          throw new Error("Autentificare eșuată")
        } catch (error: any) {
          console.error("NextAuth error:", error)

          // Returnăm mesaje de eroare mai prietenoase
          if (error.code === "auth/user-not-found") {
            throw new Error("Utilizatorul nu există")
          } else if (error.code === "auth/wrong-password") {
            throw new Error("Parolă incorectă")
          } else if (error.code === "auth/invalid-email") {
            throw new Error("Email invalid")
          } else if (error.code === "auth/too-many-requests") {
            throw new Error("Prea multe încercări. Încercați mai târziu")
          }

          throw new Error(error.message || "Eroare la autentificare")
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 zile
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.uid
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || ""
        session.user.uid = token.uid as string
        session.user.email = token.email as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: process.env.NODE_ENV === "development",
})

export { handler as GET, handler as POST }
