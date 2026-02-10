import { SignUpForm } from "@/components/sign-up-form";
import { getServiceSupabase } from "@/lib/db/server-supabase";
import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { LanguageSwitcher } from "@/components/language-switcher";
import { hasEnvVars } from "@/lib/utils";
import Image from "next/image";

export default async function Page() {
  const supabase = getServiceSupabase();
  const { data: midwives } = await supabase
    .from('midwives')
    .select('id, first_name, last_name, practice_name')
    .eq('is_active', true)
    .order('first_name');

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
        <div className="w-full max-w-sm">
          <SignUpForm midwives={midwives || []} />
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
