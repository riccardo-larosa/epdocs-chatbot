import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { RFP_COOKIE_NAME, type RfpTokenPayload } from '@/lib/rfpAuth'

const PUBLIC_PATHS = ['/rfp/login']
const ADMIN_PATHS = ['/rfp/admin']

function getSecret(): Uint8Array {
  const secret = process.env.RFP_JWT_SECRET
  if (!secret) return new TextEncoder().encode('')
  return new TextEncoder().encode(secret)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow login page through unconditionally
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  const token = request.cookies.get(RFP_COOKIE_NAME)?.value
  let payload: RfpTokenPayload | null = null

  if (token) {
    try {
      const result = await jwtVerify(token, getSecret())
      payload = result.payload as RfpTokenPayload
    } catch {
      // invalid or expired token — fall through to redirect
    }
  }

  // Not authenticated — send to login
  if (!payload) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/rfp/login'
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated but not admin — deny admin paths
  if (ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')) && payload.role !== 'admin') {
    const rfpUrl = request.nextUrl.clone()
    rfpUrl.pathname = '/rfp'
    return NextResponse.redirect(rfpUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/rfp/:path*'],
}
