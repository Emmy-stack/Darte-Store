<<<<<<< HEAD
// import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neon, neonConfig } from '@neondatabase/serverless';

import ws from 'ws';
neonConfig.webSocketConstructor = ws;

neonConfig.poolQueryViaFetch = true;

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaNeon({connectionString});
const prisma = global.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'development') global.prisma = prisma;
=======
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

const prismaClientSingleton = () => {
    const connectionString = process.env.DATABASE_URL;
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({ adapter });
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
>>>>>>> 9e05213 (Update project)

export default prisma;