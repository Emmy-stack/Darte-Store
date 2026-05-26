import 'dotenv/config';
import prisma from '../lib/prisma.js';

async function main() {
    try {
        console.log("=== ALL STORES IN DATABASE ===");
        const stores = await prisma.store.findMany({
            include: { payoutAccount: true }
        });
        stores.forEach(store => {
            console.log(`ID: ${store.id} | Name: ${store.name} | Status: ${store.status} | Active: ${store.isActive} | Payout Account: ${store.payoutAccount ? store.payoutAccount.bankName + ' (Subaccount: ' + store.payoutAccount.subaccountId + ')' : 'None'}`);
        });
        process.exit(0);
    } catch (e) {
        console.error("Error querying stores:", e);
        process.exit(1);
    }
}

main();
