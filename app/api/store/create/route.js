import { uploadToImageKit, buildImageUrl } from "@/configs/imagekit";
import prisma from "@/lib/prisma";
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
        
        // Settlement preferences (strictly enforced to 98% / 2% split)
        const splitType = "percentage";
        const splitValue = 98;

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

        const isLocal = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_BASE_URL?.includes("localhost");
        const isMockMode = isLocal && (!process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY === "mock" || process.env.PAYSTACK_SECRET_KEY.startsWith("mock"));

        let accountName = "TEST ACCOUNT (SANDBOX)";
        let subaccountId = null;

        if (!isMockMode) {
            // Call Paystack to verify the account details on the server-side
            const resolveResponse = await fetch(`https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            });

            const resolveData = await resolveResponse.json();

            if (!resolveResponse.ok || !resolveData.status) {
                console.error("Paystack onboarding verify-bank failed:", resolveData);
                return NextResponse.json({ error: resolveData.message || "Failed to verify bank details with Paystack" }, { status: 400 });
            }

            accountName = resolveData.data.account_name;

            // Create Paystack transfer recipient
            try {
                const recipientResponse = await fetch("https://api.paystack.co/transferrecipient", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        type: "nuban",
                        name: accountName,
                        account_number: accountNumber,
                        bank_code: bankCode,
                        currency: "NGN",
                    }),
                });

                const recipientData = await recipientResponse.json();

                if (!recipientResponse.ok || !recipientData.status) {
                    console.error("Paystack onboarding recipient creation failed:", recipientData);
                    return NextResponse.json({ error: recipientData.message || "Failed to register recipient with Paystack" }, { status: 400 });
                }

                subaccountId = recipientData.data.recipient_code;
            } catch (subError) {
                console.error("Error calling Paystack Recipient API:", subError);
                return NextResponse.json({ error: subError.message || "Error registering recipient with Paystack" }, { status: 500 });
            }
        } else {
            console.log("Mock Mode: Simulating resolved account name and Paystack recipient code.");
            subaccountId = "RCP_" + Math.random().toString(36).substring(2, 12).toUpperCase();
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