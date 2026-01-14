import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "../../globals.css";
import { hasEnvVars } from "@/lib/utils";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import Link from "next/link";
import Image from "next/image";

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
        <html lang="en" suppressHydrationWarning>
            <body className={`${outfit.className} antialiased`}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="light"
                    enableSystem={false}
                    disableTransitionOnChange
                    forcedTheme="light"
                >
                    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-9 sticky top-0 z-50">
                        <div className="w-full max-w-full flex justify-center items-center p-2 px-2 text-sm bg-secondary">

                            <Image src="/Goudecho.png"
                                alt="Logo"
                                width={100}
                                height={100}
                            />
                        </div>
                    </nav>
                    {children}
                    <Toaster position="top-right" />
                </ThemeProvider>
            </body>
        </html>
    );
}
