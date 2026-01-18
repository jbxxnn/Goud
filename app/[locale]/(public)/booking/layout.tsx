import { Metadata } from "next";
import "../../../globals.css";
import Image from "next/image";
import { LanguageSwitcher } from "@/components/language-switcher";
import Link from "next/link";
import { ArrowBigLeft } from "lucide-react";


const defaultUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export const metadata: Metadata =
{
    metadataBase: new URL(defaultUrl),
    title: "Goud Echo",
    description: "De snelste manier om een afspraak te maken bij Goud Echo",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <nav className="w-full flex justify-center bg-secondary border-b border-b-foreground/10 h-9 sticky top-0 z-50 px-4">
                <div className="w-full max-w-full flex text-lg p-2 px-2 text-sm bg-secondary">
                    <Link href="/">⃪⃪ </Link>
                </div>
                <LanguageSwitcher />
            </nav>
            {children}
        </>
    );
}
