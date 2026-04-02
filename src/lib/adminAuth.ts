import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/rfpAuth'

export async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('rfp_session')?.value
  if (!token) return false
  try {
    const payload = await verifyToken(token)
    return payload.role === 'admin'
  } catch {
    return false
  }
}
