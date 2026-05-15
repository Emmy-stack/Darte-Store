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

        // Ensure user exists in the database
        await prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: {
                id: userId,
                email: user.emailAddresses[0].emailAddress,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                image: user.imageUrl,
            }
        });

        // Get the data from the form 
        const formData = await request.formData()

        const name = formData.get("name")
        const username = formData.get("username")
        const description = formData.get("description")
        const email = formData.get("email")
        const contact = formData.get("contact")
        const address = formData.get("address")
        const image = formData.get("image")

        if (!name || !username || !description || !email || !contact || !address || !image) {
            return NextResponse.json({error: "missing store info"}, {status: 400})
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
            where: { username: username.toLowerCase() }
        })
        if (isUsernameTaken) {
            return NextResponse.json({error: "Username already taken"}, {status: 400})
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
                username: username.toLowerCase(),
                email,
                contact,
                address,
                logo: optimizedImage,
                
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