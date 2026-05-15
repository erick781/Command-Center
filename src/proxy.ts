import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const res = NextResponse.next()
  const pathname = request.nextUrl.pathname
  const isStaticAsset = /\.[a-z0-9]+$/i.test(pathname)
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Allow public routes: login, auth callback (password reset), APIs, legacy V1, and static assets.
  if (
    pathname === '/login' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/v1/') ||
    pathname.startsWith('/_next/') ||
    isStaticAsset
  ) {
    return res
  }

  // Redirect to login if no session
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
