"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface HeroButtonProps {
    ctaText: string;
}

export function HeroButton({ ctaText }: HeroButtonProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = () => {
        setIsLoading(true);
        router.push("/booking");
    };

    return (
        <Button
            className="ml-2 bg-primary text-accent border border-primary min-w-[180px]" // Min-width to prevent layout shift
            onClick={handleClick}
            disabled={isLoading}
        >
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                </>
            ) : (
                ctaText
            )}
        </Button>
    );
}
