import "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    uid?: string
  }

  interface Session {
    user: {
      id: string
      uid?: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string
  }
}
