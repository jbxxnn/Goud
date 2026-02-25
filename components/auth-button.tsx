import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { getTranslations } from 'next-intl/server';

export async function AuthButton() {
  const supabase = await createClient();
  const t = await getTranslations('Auth');
  const tNav = await getTranslations('Navigation');

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  return user ? (
    <div className="flex items-center gap-4">
      {t('greeting', { name: user.email })}
      <Button asChild size="sm" className="bg-accent text-primary hover:text-white">
        <Link href="/dashboard">{tNav('dashboard')}</Link>
      </Button>
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" className="bg-primary text-white">
        <Link href="/auth/login">{t('signIn')}</Link>
      </Button>
      <Button asChild size="sm" className="bg-primary text-white">
        <Link href="/auth/sign-up">{t('signUp')}</Link>
      </Button>
    </div>
  );
}
