const fs = require('fs');
const path = require('path');

// Simple .env parser to support all node versions
function loadEnv() {
    const envPath = path.join(__dirname, '../.env');
    if (!fs.existsSync(envPath)) {
        console.warn("Warning: .env file not found in root.");
        return;
    }
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const index = trimmed.indexOf('=');
        if (index === -1) return;
        const key = trimmed.substring(0, index).trim();
        let val = trimmed.substring(index + 1).trim();
        // Strip quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
        }
        if (!process.env[key]) {
            process.env[key] = val;
        }
    });
}

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

loadEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in environment variables");
}
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, errorFormat: 'pretty' });

async function run() {
    console.log("Starting subaccount migration for existing sellers...");
    
    const key = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!key) {
        console.error("Error: FLUTTERWAVE_SECRET_KEY is not defined in .env");
        process.exit(1);
    }
    const isTestMode = key.startsWith("FLWSECK_TEST-");
    console.log(`Mode: ${isTestMode ? "Sandbox (Test)" : "Production (Live)"}`);

    // Query payout accounts that lack a subaccountId
    const payoutAccounts = await prisma.sellerPayoutAccount.findMany({
        where: {
            OR: [
                { subaccountId: null },
                { subaccountId: "" }
            ]
        },
        include: {
            store: true
        }
    });

    console.log(`Found ${payoutAccounts.length} payout accounts without a subaccountId.`);

    let successCount = 0;
    let failCount = 0;

    for (const pa of payoutAccounts) {
        const store = pa.store;
        if (!store) {
            console.warn(`Warning: Payout account ${pa.id} has no linked store. Skipping.`);
            continue;
        }

        console.log(`----------------------------------------`);
        console.log(`Processing Store: "${store.name}" (${store.id})`);
        console.log(`Bank: ${pa.bankName} (${pa.bankCode}), Account: ${pa.accountNumber}`);

        // Normalize splitValue: support both 99 (percentage points) and 0.99 (decimal)
        const flwSplitValue = pa.splitType === "percentage"
            ? (pa.splitValue > 0 && pa.splitValue < 1 ? pa.splitValue : (pa.splitValue / 100))
            : pa.splitValue;
        
        let subaccountId = null;
        
        // Check if another store in our DB already registered a subaccount for the exact same bank details
        const duplicate = await prisma.sellerPayoutAccount.findFirst({
            where: {
                bankCode: pa.bankCode,
                accountNumber: pa.accountNumber,
                subaccountId: { not: null }
            }
        });

        if (duplicate && duplicate.subaccountId) {
            subaccountId = duplicate.subaccountId;
            console.log(`Found existing duplicate bank credentials. Reusing subaccount ID: ${subaccountId}`);
        } else {
            try {
                const response = await fetch("https://api.flutterwave.com/v3/subaccounts", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${key}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        account_bank: pa.bankCode,
                        account_number: pa.accountNumber,
                        business_name: store.name,
                        business_email: store.email || "merchant@darte.com",
                        business_contact: store.name,
                        business_mobile: store.contact || "09000000000",
                        country: "NG",
                        split_type: pa.splitType,
                        split_value: flwSplitValue,
                    }),
                });

                const data = await response.json();

                if (!response.ok || data.status !== "success") {
                    console.error(`Flutterwave API returned error for "${store.name}":`, data);
                    if (isTestMode) {
                        subaccountId = "RS_MOCK_SUB_" + Math.random().toString(36).substring(2, 10).toUpperCase();
                        console.log(`Test mode: Assigned mock subaccount ID: ${subaccountId}`);
                    } else {
                        failCount++;
                        continue;
                    }
                } else {
                    subaccountId = data.data.subaccount_id || data.data.id;
                }
            } catch (err) {
                console.error(`Network or fetch error for "${store.name}":`, err.message);
                if (isTestMode) {
                    subaccountId = "RS_MOCK_SUB_" + Math.random().toString(36).substring(2, 10).toUpperCase();
                    console.log(`Test mode: Assigned mock subaccount ID: ${subaccountId}`);
                } else {
                    failCount++;
                    continue;
                }
            }
        }

        if (subaccountId) {
            try {
                await prisma.sellerPayoutAccount.update({
                    where: { id: pa.id },
                    data: { subaccountId }
                });
                console.log(`Success: Registered and updated subaccountId to: ${subaccountId}`);
                successCount++;
            } catch (dbErr) {
                console.error(`DB Update failed for store "${store.name}":`, dbErr.message);
                failCount++;
            }
        }
    }

    console.log(`========================================`);
    console.log(`Migration Complete Summary:`);
    console.log(`- Total Checked: ${payoutAccounts.length}`);
    console.log(`- Successfully Migrated: ${successCount}`);
    console.log(`- Failed/Skipped: ${failCount}`);
    
    await prisma.$disconnect();
}

run().catch(err => {
    console.error("Global migration crash:", err);
    process.exit(1);
});
