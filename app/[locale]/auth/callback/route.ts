import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  // Helper function to handle redirects with locale preservation
  const getRedirectUrl = (path: string) => {
    // If path is already localized, return as is
    if (path.startsWith(`/${locale}/`) || path === `/${locale}`) {
      return path;
    }
    // Prepend locale if it's a relative path starting with /
    if (path.startsWith("/")) {
      return `/${locale}${path}`;
    }
    return path;
  };

  // Handle code-based flow (PKCE)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(getRedirectUrl(next), request.url));
    } else {
      return NextResponse.redirect(
        new URL(
          getRedirectUrl(`/auth/error?error=${encodeURIComponent(error.message)}`),
          request.url
        )
      );
    }
  }

  // Handle token_hash-based flow (traditional magic link)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(getRedirectUrl(next), request.url));
    } else {
      return NextResponse.redirect(
        new URL(
          getRedirectUrl(`/auth/error?error=${encodeURIComponent(error.message)}`),
          request.url
        )
      );
    }
  }

  // No valid auth parameter provided
  return NextResponse.redirect(
    new URL(
      getRedirectUrl("/auth/login?error=Invalid authentication link"),
      request.url
    )
  );
}

