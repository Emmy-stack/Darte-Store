
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neon, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();

neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaNeon({connectionString});
const prisma = new PrismaClient({ adapter });

async function main() {
    try {
        const users = await prisma.user.findMany();
        console.log("Users found:", users.length);
        process.exit(0);
    } catch (e) {
        console.error("Error querying users:", e);
        process.exit(1);
    }
}

main();
