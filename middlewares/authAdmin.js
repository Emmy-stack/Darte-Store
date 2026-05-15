import prisma from "@/lib/prisma"

const authAdmin = async (userId) => {
    try {
<<<<<<< HEAD
=======
        console.log("authAdmin checking userId:", userId);
>>>>>>> 9e05213 (Update project)
        if (!userId) return false;

        const user = await prisma.user.findUnique({where: {id: userId}})

        if(user && user.email === "darte.universe@gmail.com"){
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
