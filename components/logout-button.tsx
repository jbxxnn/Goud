"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import { BOOKING_STATE_KEY } from "@/lib/types/booking";

export function LogoutButton() {
  const router = useRouter();
  const t = useTranslations('Auth');

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    try {
      localStorage.removeItem(BOOKING_STATE_KEY);
    } catch {}
    router.refresh();
    router.push("/auth/login");
  };

  return <Button onClick={logout} size="sm" className="bg-primary text-white">{t('logout')}</Button>;
}
