import 'dotenv/config';
import prisma from '../lib/prisma.js';

async function main() {
    try {
        console.log("=== DEMOTING TEST USER TO USER ROLE ===");
        const testUserId = "user_3DQNXAu5ByzXuzzPmN7JrfbTA5N";
        await prisma.user.update({
            where: { id: testUserId },
            data: { role: "user" }
        });
        console.log("Successfully demoted.");
        
        const users = await prisma.user.findMany({
            include: { store: true }
        });
        console.log("=== USERS IN DATABASE ===");
        users.forEach(user => {
            console.log(`ID: ${user.id} | Email: ${user.email} | Name: ${user.name} | Role: ${user.role} | Store: ${user.store ? user.store.name + ' (' + user.store.status + ')' : 'None'}`);
        });
        process.exit(0);
    } catch (e) {
        console.error("Error in database execution:", e);
        process.exit(1);
    }
}

main();
