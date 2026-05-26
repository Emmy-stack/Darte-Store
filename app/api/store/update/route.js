import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { uploadToImageKit, buildImageUrl } from "@/configs/imagekit";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }

        const storeId = await authSeller(userId);
        if (!storeId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const name = formData.get("name")?.toString().trim();
        const email = formData.get("email")?.toString().trim();
        const contact = formData.get("contact")?.toString().trim();
        const logo = formData.get("logo");

        if (!name || !email || !contact) {
            return NextResponse.json({ error: "name, email, and contact are required" }, { status: 400 });
        }

        const data = { name, email, contact };

        if (logo && typeof logo === "object" && logo.size) {
            const buffer = Buffer.from(await logo.arrayBuffer());
            const response = await uploadToImageKit({
                file: buffer,
                fileName: logo.name,
                folder: "logos",
            });

            const optimizedImage = buildImageUrl({
                src: response.filePath || response.filepath || response.url,
                transformation: [
                    { quality: "auto" },
                    { format: "webp" },
                    { width: "512" },
                ],
            });

            data.logo = optimizedImage;
        }

        const updatedStore = await prisma.store.update({
            where: { id: storeId },
            data,
        });

        return NextResponse.json({ store: updatedStore });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
