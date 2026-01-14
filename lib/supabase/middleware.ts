import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest, response?: NextResponse) {
  let supabaseResponse = response || NextResponse.next({
    request,
  });

  // If the env vars are not set, skip middleware check.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          // If we passed a response, we don't want to recreate it unless absolutely necessary.
          // The pattern used in supabase docs usually recreates it to ensure cookies are passed to the request.
          // However, when chaining with next-intl, we want to preserve the intl response.
          // We can just set cookies on the existing supabaseResponse.

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Normalized path without locale prefix for checking protected routes
  let path = request.nextUrl.pathname;
  // Remove the locale prefix (e.g. /nl, /en) if present
  path = path.replace(/^\/(en|nl)/, '');
  if (path === '') path = '/';

  if (
    path !== "/" &&
    !user &&
    !path.startsWith("/login") &&
    !path.startsWith("/auth") &&
    // Public booking flow and its supporting APIs should be accessible without auth
    !path.startsWith("/booking") &&
    !path.startsWith("/api/availability") &&
    !path.startsWith("/api/availability/heatmap") &&
    !path.startsWith("/api/services") &&
    !path.startsWith("/api/locations-simple") &&
    !path.startsWith("/api/auth/email-exists") &&
    !path.startsWith("/api/auth/checkout-signup") &&
    !path.startsWith("/api/users/by-email") &&
    !path.startsWith("/api/bookings") &&
    !path.startsWith("/api/midwives")
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    // Keep the current locale in the redirect if possible, otherwise it might default to one
    // But since we are redirecting to a relative path /auth/login, we might want to ensure it has the locale if it was present.
    // However, the logic below sets pathname to /auth/login.
    // If we are on /nl/dashboard, we want to go to /nl/auth/login.

    // Check if there was a locale prefix
    const localeMatch = request.nextUrl.pathname.match(/^\/(en|nl)/);
    const localePrefix = localeMatch ? localeMatch[0] : '';

    url.pathname = `${localePrefix}/auth/login`;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
