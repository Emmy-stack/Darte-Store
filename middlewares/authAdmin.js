import prisma from "@/lib/prisma"

const authAdmin = async (userId) => {
    try {
        console.log("authAdmin checking userId:", userId);

        if (!userId) return false;

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) return false;

        // Only allow user with role "admin" to be admin
        return user.role === "admin";
    } catch (error) {
        console.error("Error in authAdmin middleware:", error);
        return false;
    }
}

export default authAdmin;
