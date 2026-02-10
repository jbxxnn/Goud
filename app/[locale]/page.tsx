import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { Hero } from "@/components/hero";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ConnectSupabaseSteps } from "@/components/tutorial/connect-supabase-steps";
import { SignUpUserSteps } from "@/components/tutorial/sign-up-user-steps";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from "@/components/language-switcher";

import { BookingProvider } from "@/components/booking/booking-context";
import { BookingFlow } from "@/components/booking/booking-flow";
import Image from "next/image";

export default function Home() {
  const t = useTranslations('HomePage');

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex items-center justify-center border-b border-b-foreground/10 h-16">
          <div>
            <Image
              src="/Goudecho.png"
              alt="Goud Echo"
              width={100}
              height={100}
            />
          </div>
          <div className="w-full max-w-5xl flex items-center justify-end gap-4 p-3 px-5 text-sm">
            <LanguageSwitcher />
            {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
          </div>
        </nav>
        <div className="flex-1 flex flex-col gap-20 max-w-full w-full min-h-[50vh] justify-center items-center p-5">
          <BookingProvider>
            <BookingFlow />
          </BookingProvider>

        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 bg-accent">
          <div>
            <Image
              src="/Goudecho.png"
              alt="Goud Echo"
              width={100}
              height={100}
            />
          </div>
          <div className="w-full max-w-5xl flex items-center justify-end gap-4 p-3 px-5 text-sm">
            <LanguageSwitcher />
          </div>
        </footer>
      </div>
    </main>
  );
}
