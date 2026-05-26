import { uploadToImageKit, buildImageUrl } from "@/configs/imagekit";
import prisma from "@/lib/prisma";
import { getFlutterwaveSplitValue, normalizePercentageSplitValue } from "@/lib/splitUtils";
import { getAuth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Create the store 

export async function POST(request) {
    try {
        const {userId} = getAuth(request);
        const user = await currentUser();

        if (!userId || !user) {
            return NextResponse.json({error: "unauthorized"}, {status: 401});
        }

        // Ensure user exists in the database, and check/generate username if missing
        let dbUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        // Helper to generate a unique username
        const generateUniqueUsername = async () => {
            let generatedUsername = "";
            let isUnique = false;
            while (!isUnique) {
                const randomDigits = Math.floor(100000 + Math.random() * 900000); // 6 digits
                generatedUsername = `darte${randomDigits}`;
                const existingUser = await prisma.user.findUnique({ where: { username: generatedUsername } });
                const existingStore = await prisma.store.findUnique({ where: { username: generatedUsername } });
                if (!existingUser && !existingStore) {
                    isUnique = true;
                }
            }
            return generatedUsername;
        };

        let activeUsername = dbUser?.username;

        if (!dbUser) {
            // Generate a username for the new user
            activeUsername = await generateUniqueUsername();
            dbUser = await prisma.user.create({
                data: {
                    id: userId,
                    email: user.emailAddresses[0].emailAddress,
                    name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                    image: user.imageUrl,
                    username: activeUsername,
                }
            });
        } else if (!dbUser.username) {
            // If user already exists but does not have a username, generate and save it
            activeUsername = await generateUniqueUsername();
            dbUser = await prisma.user.update({
                where: { id: userId },
                data: { username: activeUsername }
            });
        }

        // Get the data from the form 
        const formData = await request.formData()

        const name = formData.get("name")
        const description = formData.get("description")
        const email = formData.get("email")
        const contact = formData.get("contact")
        const address = formData.get("address")
        const image = formData.get("image")
        const bankCode = formData.get("bankCode")
        const bankName = formData.get("bankName")
        const accountNumber = formData.get("accountNumber")
        
        // Settlement preferences
        const splitType = formData.get("splitType") || "percentage"
        const splitValueInput = Number(formData.get("splitValue"))
        const splitValue = Number.isFinite(splitValueInput) && splitValueInput > 0 ? splitValueInput : 99

        if (!name || !description || !email || !contact || !address || !image || !bankCode || !bankName || !accountNumber) {
            return NextResponse.json({error: "missing store or bank payout info"}, {status: 400})
        }

        // Check if user have already registered a store 
        const store = await prisma.store.findFirst({
            where: { userId: userId}
        })

        // If store is already registered, send a status of store
        if(store){
            return NextResponse.json({status: store.status})
        }

        // Check if username is already taken
        const isUsernameTaken = await prisma.store.findFirst({
            where: { username: activeUsername.toLowerCase() }
        })
        if (isUsernameTaken) {
            return NextResponse.json({error: "Username already taken"}, {status: 400})
        }

        const isTestMode = process.env.FLUTTERWAVE_SECRET_KEY && process.env.FLUTTERWAVE_SECRET_KEY.startsWith("FLWSECK_TEST-");

        // Call Flutterwave to verify the account details on the server-side
        const flwResponse = await fetch("https://api.flutterwave.com/v3/accounts/resolve", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                account_number: accountNumber,
                account_bank: bankCode,
            }),
        });

        const flwData = await flwResponse.json();

        let accountName;

        if (!flwResponse.ok || flwData.status !== "success") {
            console.error("Flutterwave onboarding verify-bank failed:", flwData);
            
            // In test mode, fallback to a mock name to allow testing other banks
            if (isTestMode) {
                console.log("Test mode: Creating store with mock account name");
                accountName = "TEST ACCOUNT (SANDBOX)";
            } else {
                return NextResponse.json({ error: flwData.message || "Failed to verify bank details with Flutterwave" }, { status: 400 });
            }
        } else {
            accountName = flwData.data.account_name;
        }

        // Register Seller as a Collection Subaccount in Flutterwave
        // Flutterwave split_value expects a decimal for percentage (e.g. 0.90 for 90%)
        const normalizedSplitValue = splitType === "percentage" ? normalizePercentageSplitValue(splitValue) : splitValue;
        const flwSplitValue = getFlutterwaveSplitValue(splitType, normalizedSplitValue);
        
        let subaccountId = null;
        try {
            const subaccountResponse = await fetch("https://api.flutterwave.com/v3/subaccounts", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    account_bank: bankCode,
                    account_number: accountNumber,
                    business_name: name,
                    business_email: email,
                    business_contact: name,
                    business_mobile: contact,
                    country: "NG",
                    currency: "NGN",
                    split_type: splitType,
                    split_value: flwSplitValue,
                }),
            });

            const subaccountData = await subaccountResponse.json();

            if (!subaccountResponse.ok || subaccountData.status !== "success") {
                console.error("Flutterwave onboarding subaccount creation failed:", subaccountData);
                if (isTestMode) {
                    console.log("Test mode: Generating mock subaccount ID");
                    subaccountId = "RS_MOCK_SUB_" + Math.random().toString(36).substring(2, 10).toUpperCase();
                } else {
                    return NextResponse.json({ error: subaccountData.message || "Failed to register subaccount with Flutterwave" }, { status: 400 });
                }
            } else {
                subaccountId = subaccountData.data.subaccount_id || subaccountData.data.id;
            }
        } catch (subError) {
            console.error("Error calling Flutterwave Subaccounts API:", subError);
            if (isTestMode) {
                subaccountId = "RS_MOCK_SUB_" + Math.random().toString(36).substring(2, 10).toUpperCase();
            } else {
                return NextResponse.json({ error: subError.message || "Error registering subaccount with Flutterwave" }, { status: 500 });
            }
        }

        // Image upload to ImageKit
        const buffer = Buffer.from(await image.arrayBuffer());
        const response = await uploadToImageKit({
            file: buffer,
            fileName: image.name,
            folder: "logos"
        });

        const optimizedImage = buildImageUrl({
            src: response.filePath || response.filepath || response.url,
            transformation: [
                { quality: 'auto' },
                { format: 'webp' },
                { width: '512' }
            ]
        });

        const newStore = await prisma.store.create({
            data: {
                userId,
                name,
                description,
                username: activeUsername.toLowerCase(),
                email,
                contact,
                address,
                logo: optimizedImage,
                payoutAccount: {
                    create: {
                        bankCode,
                        bankName,
                        accountNumber,
                        accountName,
                        isVerified: true,
                        subaccountId,
                        splitType,
                        splitValue: normalizedSplitValue,
                    }
                }
            }
        })

        // Link store to user
        await prisma.user.update({
            where: {
                id: userId
            },
            data: {store: {connect: {id: newStore.id}}}
        })

        return NextResponse.json({message: "applied, waiting for approval"})

    } catch (error) {
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, {status: 400})
    }
}

// Check if user has registered a store, if yes then send status of the store

export async function GET(request) {
    try {
        const {userId} = getAuth(request)

         // Check if user have already registered a store 
        const store = await prisma.store.findFirst({
            where: { userId: userId}
        })

        // If store is already registered, send a status of store
        if(store){
            return NextResponse.json({status: store.status})
        }

        return NextResponse.json({status: "not registered"})
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, {status: 400})
    }
}