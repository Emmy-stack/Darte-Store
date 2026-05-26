import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import authAdmin from "@/middlewares/authAdmin";
import prisma from "@/lib/prisma";
import { uploadToImageKit, buildImageUrl } from "@/configs/imagekit";

export async function POST(request) {
    try {
        const { userId } = await auth();

        // Check if the user is an admin
        const isAdmin = await authAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ success: false, message: "Not authorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const indexStr = formData.get("index");
        const action = formData.get("action")?.toString();
        const link = formData.get("link")?.toString().trim();
        const image = formData.get("image");

        if (indexStr === null || indexStr === undefined) {
            return NextResponse.json({ success: false, message: "Slide index is required" }, { status: 400 });
        }

        const index = parseInt(indexStr.toString(), 10);
        if (isNaN(index) || index < 0 || index > 2) {
            return NextResponse.json({ success: false, message: "Invalid slide index (must be 0, 1, or 2)" }, { status: 400 });
        }

        const existingSlide = await prisma.heroSlide.findUnique({
            where: { index }
        });

        if (action === "reset") {
            if (existingSlide) {
                await prisma.heroSlide.delete({
                    where: { index }
                });
            }
            return NextResponse.json({ success: true, message: "Slide reset to default successfully!" });
        }

        let imageUrl = existingSlide?.imageUrl || "";

        if (image && typeof image === "object" && image.size) {
            const buffer = Buffer.from(await image.arrayBuffer());
            const response = await uploadToImageKit({
                file: buffer,
                fileName: `hero_slide_${index}_${Date.now()}_${image.name}`,
                folder: "advertisements",
            });

            imageUrl = buildImageUrl({
                src: response.filePath || response.filepath || response.url,
                transformation: [
                    { quality: "auto" },
                    { format: "webp" },
                ],
            });
        }

        // If it's a new customization, an image is required
        if (!imageUrl) {
            return NextResponse.json({ success: false, message: "Please upload an image for this slide" }, { status: 400 });
        }

        const updatedSlide = await prisma.heroSlide.upsert({
            where: { index },
            update: {
                imageUrl,
                link: link || null,
            },
            create: {
                index,
                imageUrl,
                link: link || null,
            }
        });

        return NextResponse.json({ success: true, slide: updatedSlide, message: "Slide updated successfully!" });

    } catch (error) {
        console.error("Error updating hero slide:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
