import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

export const RFP_COOKIE_NAME = 'rfp_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 // 24 hours in seconds

export interface RfpTokenPayload extends JWTPayload {
  role: 'user' | 'admin'
}

function getSecret(): Uint8Array {
  const secret = process.env.RFP_JWT_SECRET
  if (!secret) {
    throw new Error('RFP_JWT_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

export async function signToken(username: string, role: 'user' | 'admin'): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<RfpTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as RfpTokenPayload
}

export function sessionCookieOptions(maxAge: number = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    path: '/rfp',
    maxAge,
    secure: process.env.NODE_ENV === 'production',
  }
}
