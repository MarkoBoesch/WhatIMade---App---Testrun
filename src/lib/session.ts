import { SessionOptions } from 'iron-session'

export interface SessionData {
  userId?: string
  email?: string
  name?: string
  isLoggedIn: boolean
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? 'healthcare-comparables-secret-32-chars-long!!',
  cookieName: 'hc_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
}
