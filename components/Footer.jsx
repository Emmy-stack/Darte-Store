'use client'
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

const Footer = () => {
    const { user } = useUser()

    const MailIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M14.6654 4.66699L8.67136 8.48499C8.46796 8.60313 8.23692 8.66536 8.0017 8.66536C7.76647 8.66536 7.53544 8.60313 7.33203 8.48499L1.33203 4.66699M2.66536 2.66699H13.332C14.0684 2.66699 14.6654 3.26395 14.6654 4.00033V12.0003C14.6654 12.7367 14.0684 13.3337 13.332 13.3337H2.66536C1.92898 13.3337 1.33203 12.7367 1.33203 12.0003V4.00033C1.33203 3.26395 1.92898 2.66699 2.66536 2.66699Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)
    const PhoneIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M9.22003 11.045C9.35772 11.1082 9.51283 11.1227 9.65983 11.086C9.80682 11.0493 9.93692 10.9636 10.0287 10.843L10.2654 10.533C10.3896 10.3674 10.5506 10.233 10.7357 10.1404C10.9209 10.0479 11.125 9.99967 11.332 9.99967H13.332C13.6857 9.99967 14.0248 10.1402 14.2748 10.3902C14.5249 10.6402 14.6654 10.9794 14.6654 11.333V13.333C14.6654 13.6866 14.5249 14.0258 14.2748 14.2758C14.0248 14.5259 13.6857 14.6663 13.332 14.6663C10.1494 14.6663 7.09719 13.4021 4.84675 11.1516C2.59631 8.90119 1.33203 5.84894 1.33203 2.66634C1.33203 2.31272 1.47251 1.97358 1.72256 1.72353C1.9726 1.47348 2.31174 1.33301 2.66536 1.33301H4.66536C5.01899 1.33301 5.35812 1.47348 5.60817 1.72353C5.85822 1.97358 5.9987 2.31272 5.9987 2.66634V4.66634C5.9987 4.87333 5.9505 5.07749 5.85793 5.26263C5.76536 5.44777 5.63096 5.60881 5.46536 5.73301L5.15336 5.96701C5.03098 6.06046 4.94471 6.1934 4.90923 6.34324C4.87374 6.49308 4.89122 6.65059 4.9587 6.78901C5.86982 8.63959 7.36831 10.1362 9.22003 11.045Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)
    const TelegramIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M4.5 12L19 5.2L14.9 18.4L11.8 14.6L9.1 17.3L4.5 12Z" fill="#90A1B9" /> </svg>)
    const TikTokIcon = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#90A1B9" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.62 2.89 2.89 0 0 1 2.31-4.51c.36 0 .7.06 1.02.18V9.25a7.21 7.21 0 0 0-1 .08c-3.92.54-6.9 3.89-6.9 7.9a7.22 7.22 0 0 0 11.66 5.67V10c1.01.76 2.24 1.21 3.58 1.25v-3.46a4.83 4.83 0 0 1-1.75-1.1z" />
        </svg>
    )
    const XIcon = () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#90A1B9" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    )
    const InstagramIcon = () => (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"> <path d="M14.5846 5.41699H14.593M5.83464 1.66699H14.168C16.4692 1.66699 18.3346 3.53247 18.3346 5.83366V14.167C18.3346 16.4682 16.4692 18.3337 14.168 18.3337H5.83464C3.53345 18.3337 1.66797 16.4682 1.66797 14.167V5.83366C1.66797 3.53247 3.53345 1.66699 5.83464 1.66699ZM13.3346 9.47533C13.4375 10.1689 13.319 10.8772 12.9961 11.4995C12.6732 12.1218 12.1623 12.6265 11.536 12.9417C10.9097 13.2569 10.2 13.3667 9.50779 13.2553C8.81557 13.1439 8.1761 12.8171 7.68033 12.3213C7.18457 11.8255 6.85775 11.1861 6.74636 10.4938C6.63497 9.80162 6.74469 9.0919 7.05991 8.46564C7.37512 7.83937 7.87979 7.32844 8.50212 7.00553C9.12445 6.68261 9.83276 6.56415 10.5263 6.66699C11.2337 6.7719 11.8887 7.10154 12.3944 7.60725C12.9001 8.11295 13.2297 8.76789 13.3346 9.47533Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)

    const linkSections = [
        {
            title: "PRODUCT CATEGORIES",
            links: [
                { text: "All", path: '/shop', icon: null },
                { text: "Men", path: '/shop?search=Men', icon: null },
                { text: "Women", path: '/shop?search=Women', icon: null },
                { text: "Gadgets", path: '/shop?search=Gadgets', icon: null },
                { text: "Clothing", path: '/shop?search=Clothing', icon: null },
                { text: "Jewelry", path: '/shop?search=Jewelry', icon: null },
                { text: "Beauty", path: '/shop?search=Beauty', icon: null },
                { text: "Home", path: '/shop?search=Home', icon: null },
                { text: "Gaming", path: '/shop?search=Gaming', icon: null },
                { text: "Gifts", path: '/shop?search=Gifts', icon: null },
                { text: "Luxury", path: '/shop?search=Luxury', icon: null },
                { text: "Trending", path: '/shop?search=Trending', icon: null },
                { text: "Deals", path: '/shop?search=Deals', icon: null },
            ]
        },
        {
            title: "WEBSITE",
            links: [
                ...(!user ? [{ text: "Home", path: '/', icon: null }] : []),
                { text: "Privacy Policy", path: '/privacy-policy', icon: null },
                { text: "Create Your Store", path: '/create-store', icon: null },
            ]
        },
        {
            title: "CONTACT",
            links: [
                { text: "darte.universe@gmail.com", path: 'mailto:darte.universe@gmail.com', icon: MailIcon },
                { text: "+234-704-154-5267", path: 'https://wa.me/2347041545267', icon: PhoneIcon },
                { text: "+234-704-767-3903", path: 'https://t.me/+2347047673903', icon: TelegramIcon }
            ]
        }
    ];

    const socialIcons = [
        { icon: TikTokIcon, link: "https://www.tiktok.com/@darte.universe?_r=1&_t=ZS-96fDMyAI2E5", label: "TikTok" },
        { icon: XIcon, link: "https://x.com/darteuniverse?s=21", label: "X" },
        { icon: InstagramIcon, link: "https://www.instagram.com/dart.eofficial?igsh=MTVzdzRobWUwd2N6bg%3D%3D&utm_source=qr", label: "Instagram" },
    ]

    return (
        <footer className="w-full bg-white">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row items-start justify-between gap-10 py-10 border-b border-slate-500/30 text-slate-500">
                    <div>
                        <Link href="/" className="text-4xl font-semibold text-slate-700">
                            <span className="text-green-600">Dart</span>é<span className="text-green-600 text-5xl leading-0">.</span>
                        </Link>
                        <p className="max-w-[410px] mt-6 text-sm">Welcome to Darté, your ultimate destination for the latest and smartest gadgets. From smartphones and smartwatches to essential accessories, we bring you the best in innovation — all in one place.</p>
                        <div className="flex items-center gap-3 mt-5">
                            {socialIcons.map((item, i) => (
                                <a
                                    href={item.link}
                                    key={i}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={item.label}
                                    className="flex items-center justify-center w-10 h-10 bg-slate-100 hover:scale-105 hover:border border-slate-300 transition rounded-full"
                                >
                                    <item.icon />
                                </a>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-between w-full md:w-[45%] gap-5 text-sm ">
                        {linkSections.map((section, index) => (
                            <div key={index}>
                                <h3 className="font-medium text-slate-700 md:mb-5 mb-3">{section.title}</h3>
                                <ul className="space-y-2.5">
                                    {section.links.map((link, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            {link.icon && <link.icon />}
                                            <Link href={link.path} className="hover:underline transition">{link.text}</Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
                <p className="py-4 text-sm text-slate-500">
                    Copyright 2026 © Darté All Right Reserved.
                </p>
            </div>
        </footer>
    );
};

export default Footer;