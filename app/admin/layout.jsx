import AdminLayout from "@/components/admin/AdminLayout";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import authAdmin from "@/middlewares/authAdmin";

export const metadata = {
    title: "Darté. - Admin",
    description: "Darté. - Admin",
};

export default async function RootAdminLayout({ children }) {
    const { userId, redirectToSignIn } = await auth();
    
    if (!userId) {
        return redirectToSignIn();
    }

    const isAdmin = await authAdmin(userId);
    if (!isAdmin) {
        redirect("/");
    }

    return (
        <>
            <AdminLayout>
                {children}
            </AdminLayout>
        </>
    );
}
