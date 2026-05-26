const fs = require('fs');
const path = require('path');

// Simple .env parser to support running in all node environments
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
    console.log("Starting subaccount listing & self-healing split updates (98% / NGN)...");
    
    const key = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!key) {
        console.error("Error: FLUTTERWAVE_SECRET_KEY is not defined in .env");
        process.exit(1);
    }
    const isTestMode = key.startsWith("FLWSECK_TEST-");
    console.log(`Mode: ${isTestMode ? "Sandbox (Test)" : "Production (Live)"}`);

    // Step 1: List all subaccounts on Flutterwave to match by bank account details
    console.log("Fetching live subaccounts from Flutterwave...");
    const flwSubaccountsMap = new Map(); // key: bankCode_accountNumber, value: subaccount object
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
        try {
            console.log(`Fetching subaccounts page ${page}...`);
            const res = await fetch(`https://api.flutterwave.com/v3/subaccounts?page=${page}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${key}`,
                }
            });
            const data = await res.json();
            if (!res.ok || data.status !== "success") {
                console.error(`Error fetching subaccounts page ${page}:`, data);
                break;
            }
            const list = data.data || [];
            if (list.length === 0) {
                hasMore = false;
            } else {
                for (const sub of list) {
                    const lookupKey = `${sub.account_bank}_${sub.account_number}`;
                    flwSubaccountsMap.set(lookupKey, sub);
                    console.log(`Found live subaccount: numeric_id=${sub.id}, subaccount_id=${sub.subaccount_id}, Bank=${sub.account_bank}, Account=${sub.account_number}, Name="${sub.business_name}"`);
                }
                
                const pageInfo = data.meta?.page_info;
                if (pageInfo && pageInfo.current_page >= pageInfo.total_pages) {
                    hasMore = false;
                } else {
                    page++;
                }
            }
        } catch (fetchErr) {
            console.error(`Network error listing subaccounts page ${page}:`, fetchErr.message);
            break;
        }
    }
    console.log(`Total live subaccounts matched from Flutterwave: ${flwSubaccountsMap.size}`);

    // Fetch all payout accounts from local database
    const payoutAccounts = await prisma.sellerPayoutAccount.findMany({
        include: {
            store: true
        }
    });

    console.log(`Found ${payoutAccounts.length} payout accounts total in DB.`);

    let dbUpdatesCount = 0;
    let flwUpdatesCount = 0;
    let flwCreatesCount = 0;
    let failCount = 0;
    
    const updatedSubaccountsOnFlw = new Set(); // Track subaccounts already updated by their numeric ID to avoid duplicate PUT calls

    for (const pa of payoutAccounts) {
        const store = pa.store;
        if (!store) {
            console.warn(`Warning: Payout account ${pa.id} has no linked store. Skipping.`);
            continue;
        }

        console.log(`----------------------------------------`);
        console.log(`Store: "${store.name}" (${store.id})`);
        console.log(`Current DB splitValue: ${pa.splitValue}%, subaccountId: ${pa.subaccountId || "None"}`);

        // Local target updates
        const targetSplitValue = 98.0;
        const targetSplitType = "percentage";
        const targetFlwSplitValue = 0.98; // 98%

        // Lookup bank details in live Flutterwave list
        const lookupKey = `${pa.bankCode}_${pa.accountNumber}`;
        const matchedSub = flwSubaccountsMap.get(lookupKey);
        
        let subaccountId = null;
        let numericId = null;
        let flwMatched = false;

        if (matchedSub) {
            subaccountId = matchedSub.subaccount_id || matchedSub.id;
            numericId = matchedSub.id; // Get the numeric ID for URL paths
            console.log(`Matched with existing live Flutterwave subaccount: subaccount_id=${subaccountId}, numeric_id=${numericId}`);
            flwMatched = true;
        } else {
            console.log(`No matching subaccount found on Flutterwave for bank credentials: Bank=${pa.bankCode}, Account=${pa.accountNumber}`);
        }

        // Common payload for Flutterwave API
        const subaccountPayload = {
            account_bank: pa.bankCode,
            account_number: pa.accountNumber,
            business_name: store.name,
            business_email: store.email || "merchant@darte.com",
            business_contact: store.name,
            business_mobile: store.contact || "09000000000",
            country: "NG",
            currency: "NGN",
            split_type: targetSplitType,
            split_value: targetFlwSplitValue,
        };

        if (flwMatched) {
            // Update matched subaccount on Flutterwave
            if (!updatedSubaccountsOnFlw.has(numericId)) {
                console.log(`Updating subaccount (numeric_id=${numericId}) on Flutterwave to 98% split and NGN currency...`);
                try {
                    const response = await fetch(`https://api.flutterwave.com/v3/subaccounts/${numericId}`, {
                        method: "PUT",
                        headers: {
                            Authorization: `Bearer ${key}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(subaccountPayload),
                    });

                    const data = await response.json();

                    if (!response.ok || data.status !== "success") {
                        console.error(`Failed to update Flutterwave subaccount ${numericId}:`, data);
                        failCount++;
                    } else {
                        console.log(`Flutterwave subaccount ${subaccountId} (numeric_id=${numericId}) updated successfully.`);
                        flwUpdatesCount++;
                        updatedSubaccountsOnFlw.add(numericId);
                    }
                } catch (err) {
                    console.error(`Network error updating subaccount ${numericId}:`, err.message);
                    failCount++;
                }
            } else {
                console.log(`Subaccount (numeric_id=${numericId}) already updated on Flutterwave in a previous store iteration.`);
                flwUpdatesCount++;
            }
        } else {
            // Register a new subaccount on Flutterwave
            console.log(`Registering new subaccount on Flutterwave...`);
            try {
                const response = await fetch("https://api.flutterwave.com/v3/subaccounts", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${key}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(subaccountPayload),
                });

                const data = await response.json();

                if (!response.ok || data.status !== "success") {
                    console.error(`Failed to create subaccount for "${store.name}":`, data);
                    if (isTestMode) {
                        subaccountId = "RS_MOCK_SUB_" + Math.random().toString(36).substring(2, 10).toUpperCase();
                        console.log(`Test Mode: Assigned mock subaccount: ${subaccountId}`);
                        flwCreatesCount++;
                    } else {
                        console.warn(`Could not register subaccount with Flutterwave. Skipping FLW sync but updating DB defaults.`);
                        subaccountId = null;
                        failCount++;
                    }
                } else {
                    subaccountId = data.data.subaccount_id || data.data.id;
                    numericId = data.data.id;
                    console.log(`Created new subaccount on Flutterwave: subaccount_id=${subaccountId}, numeric_id=${numericId}`);
                    flwCreatesCount++;
                    // Add it to our map in case other stores share this bank account
                    flwSubaccountsMap.set(lookupKey, data.data);
                    updatedSubaccountsOnFlw.add(numericId);
                }
            } catch (err) {
                console.error(`Network error creating subaccount:`, err.message);
                if (isTestMode) {
                    subaccountId = "RS_MOCK_SUB_" + Math.random().toString(36).substring(2, 10).toUpperCase();
                    console.log(`Test Mode: Assigned mock subaccount: ${subaccountId}`);
                    flwCreatesCount++;
                } else {
                    subaccountId = null;
                    failCount++;
                }
            }
        }

        // Update database record splitValue, splitType, and subaccountId
        try {
            await prisma.sellerPayoutAccount.update({
                where: { id: pa.id },
                data: {
                    splitValue: targetSplitValue,
                    splitType: targetSplitType,
                    subaccountId: subaccountId
                }
            });
            console.log(`Database updated: splitValue = ${targetSplitValue}%, subaccountId = ${subaccountId || "None"}`);
            dbUpdatesCount++;
        } catch (dbErr) {
            console.error(`Failed to update DB for store "${store.name}":`, dbErr.message);
            failCount++;
        }
    }

    console.log(`========================================`);
    console.log(`Update Migration Complete Summary:`);
    console.log(`- Total Records Processed: ${payoutAccounts.length}`);
    console.log(`- Database Records Updated: ${dbUpdatesCount}`);
    console.log(`- Flutterwave Subaccounts Updated: ${flwUpdatesCount}`);
    console.log(`- Flutterwave Subaccounts Created: ${flwCreatesCount}`);
    console.log(`- Errors/Failed Actions: ${failCount}`);
    
    await prisma.$disconnect();
}

run().catch(err => {
    console.error("Global migration crash:", err);
    process.exit(1);
});
