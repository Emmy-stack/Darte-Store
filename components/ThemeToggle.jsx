'use client'
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
    const [theme, setTheme] = useState("light");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const storedTheme = localStorage.getItem("theme");
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        const currentTheme = storedTheme || systemTheme;
        
        setTheme(currentTheme);
        if (currentTheme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === "light" ? "dark" : "light";
        setTheme(nextTheme);
        localStorage.setItem("theme", nextTheme);
        
        if (nextTheme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    };

    if (!mounted) return null;

    return (
        <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="fixed bottom-6 right-6 z-[999] flex items-center justify-center p-3.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer group hover:shadow-green-500/20 dark:hover:shadow-green-400/20"
        >
            <div className="relative w-5 h-5 flex items-center justify-center">
                {theme === "dark" ? (
                    <Sun className="w-5 h-5 text-amber-500 animate-[spin_10s_linear_infinite]" />
                ) : (
                    <Moon className="w-5 h-5 text-indigo-600 transition-transform duration-300 group-hover:rotate-12" />
                )}
            </div>
        </button>
    );
}
