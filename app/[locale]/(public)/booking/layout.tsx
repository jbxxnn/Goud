import { Outfit } from "next/font/google";
import { Metadata } from "next";
import "../../../globals.css";
import { hasEnvVars } from "@/lib/utils";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import Link from "next/link";
import Image from "next/image";
import { LanguageSwitcher } from "@/components/language-switcher";

const defaultUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
    metadataBase: new URL(defaultUrl),
    title: "Goud Echo",
    description: "De snelste manier om een afspraak te maken bij Goud Echo",
};

const outfit = Outfit({
    variable: "--font-outfit",
    subsets: ["latin"],
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <nav className="w-full flex justify-center bg-secondary border-b border-b-foreground/10 h-9 sticky top-0 z-50 px-4">
                <div className="w-full max-w-full flex justify-center items-center p-2 px-2 text-sm bg-secondary">

                    <Image src="/Goudecho.png"
                        alt="Logo"
                        width={100}
                        height={100}
                    />
                </div>
                <LanguageSwitcher />
            </nav>
            {children}
        </>
    );
}
