import prisma from "@/lib/prisma"

const authAdmin = async (userId) => {
    try {

        console.log("authAdmin checking userId:", userId);

        if (!userId) return false;

        const user = await prisma.user.findUnique({where: {id: userId}})

        if(user && user.role === "admin"){
            return true;
        }else {
            return false;
        }
    } catch (error) {
        console.error(error)
        return false;
    }
}

export default authAdmin;
