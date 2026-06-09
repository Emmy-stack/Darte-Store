'use client'
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BestSelling from "@/components/BestSelling";
import Hero from "@/components/Hero";
import Newsletter from "@/components/Newsletter";
import OurSpecs from "@/components/OurSpec";
import LatestProducts from "@/components/LatestProducts";

export default function Home() {
    const { isSignedIn, isLoaded } = useAuth();
    const router = useRouter();
    const [redirecting, setRedirecting] = useState(false);

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            setRedirecting(true);
            router.replace('/shop');
        }
    }, [isLoaded, isSignedIn, router]);

    // Show a minimal elegant loader while Clerk checks auth or while redirecting
    if (!isLoaded || redirecting) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-3 border-zinc-200 dark:border-zinc-700/50 border-t-green-600 dark:border-t-green-500 animate-spin" />
                    <p className="text-slate-500 text-sm font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Hero />
            <LatestProducts />
            <BestSelling />
            <OurSpecs />
            <Newsletter />
        </div>
    );
}
