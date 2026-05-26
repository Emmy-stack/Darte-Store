import 'dotenv/config';

const key = process.env.FLUTTERWAVE_SECRET_KEY;
if (!key) {
    console.error("FLUTTERWAVE_SECRET_KEY not found in env");
    process.exit(1);
}

const subaccountsToCheck = [
    "RS_F20056B909314046205BB04505B8A3C5",
    "RS_C233D7ACB6D73AC239B820139E1FA37B",
    "RS_70B70DC47C94E5C7168D7F76EFC8DD86"
];

async function checkSubaccounts() {
    console.log("Checking subaccounts on Flutterwave...");
    console.log(`Using Key: ${key.substring(0, 15)}...`);

    // 1. Fetch individual subaccount details if possible
    // Note: GET /v3/subaccounts needs numeric ID, so let's list all subaccounts and match
    let page = 1;
    let hasMore = true;
    const foundSubaccounts = [];

    while (hasMore) {
        try {
            const res = await fetch(`https://api.flutterwave.com/v3/subaccounts?page=${page}`, {
                headers: { Authorization: `Bearer ${key}` }
            });
            const data = await res.json();
            if (!res.ok || data.status !== "success") {
                console.error(`Error page ${page}:`, data);
                break;
            }
            const list = data.data || [];
            if (list.length === 0) {
                hasMore = false;
            } else {
                foundSubaccounts.push(...list);
                const pageInfo = data.meta?.page_info;
                if (pageInfo && pageInfo.current_page >= pageInfo.total_pages) {
                    hasMore = false;
                } else {
                    page++;
                }
            }
        } catch (e) {
            console.error("Fetch error:", e);
            break;
        }
    }

    console.log(`\nFound ${foundSubaccounts.length} subaccounts total on Flutterwave.\n`);

    for (const id of subaccountsToCheck) {
        const match = foundSubaccounts.find(s => s.subaccount_id === id);
        if (match) {
            console.log(`--- MATCHED SUBACCOUNT: ${id} ---`);
            console.log(`Numeric ID: ${match.id}`);
            console.log(`Business Name: ${match.business_name}`);
            console.log(`Bank: ${match.account_bank} | Account: ${match.account_number}`);
            console.log(`Split Type: ${match.split_type}`);
            console.log(`Split Value: ${match.split_value}`);
            console.log(`Status: ${match.status || 'N/A'}`);
            console.log(`Created At: ${match.created_at}`);
        } else {
            console.log(`--- NOT FOUND SUBACCOUNT: ${id} ---`);
        }
    }
}

checkSubaccounts();
