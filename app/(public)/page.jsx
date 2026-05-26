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
                    <div
                        style={{
                            width: '40px',
                            height: '40px',
                            border: '3px solid #e2e8f0',
                            borderTop: '3px solid #16a34a',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                        }}
                    />
                    <p className="text-slate-500 text-sm font-medium">Loading...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
