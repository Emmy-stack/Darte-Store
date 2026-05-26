import StoreLayout from "@/components/store/StoreLayout";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import authSeller from "@/middlewares/authSeller";

export const metadata = {
    title: "Darté. - Store Dashboard",
    description: "Darté. - Store Dashboard",
};

export default async function RootAdminLayout({ children }) {
    const { userId, redirectToSignIn } = await auth();

    if (!userId) {
        return redirectToSignIn();
    }

    const isSeller = await authSeller(userId);
    if (!isSeller) {
        redirect("/");
    }

    return (
        <>
            <StoreLayout>
                {children}
            </StoreLayout>
        </>
    );
}
