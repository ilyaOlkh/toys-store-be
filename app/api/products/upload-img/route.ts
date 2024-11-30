import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getPublicIdFromUrl(url: string): string | null {
    try {
        const matches = url.match(/\/v\d+\/(.+?)\./);
        return matches ? matches[1] : null;
    } catch {
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const { sku_code, filePath } = await request.json();
        if (!sku_code || !filePath) {
            return NextResponse.json(
                { error: "SKU and file path are required." },
                { status: 400 }
            );
        }

        // Находим продукт по SKU
        const product = await prisma.products.findUnique({
            where: { sku_code },
        });

        if (!product) {
            return NextResponse.json(
                { error: "Product with the given SKU does not exist." },
                { status: 404 }
            );
        }

        // Сохраняем путь к изображению в базе данных
        await prisma.product_images.create({
            data: {
                product_id: product.id,
                image_blob: filePath,
            },
        });

        return NextResponse.json({
            message: "File path saved to DB",
        });
    } catch (error) {
        console.error("Error saving file path to DB\n", error);
        return NextResponse.json(
            {
                error:
                    "Something went wrong while saving file path to DB: " +
                    error,
            },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const imageId = searchParams.get("imageId");

        if (!imageId) {
            return NextResponse.json(
                { error: "Image ID is required" },
                { status: 400 }
            );
        }

        // Находим изображение перед удалением
        const image = await prisma.product_images.findUnique({
            where: { id: parseInt(imageId) },
        });

        if (!image) {
            return NextResponse.json(
                { error: "Image not found" },
                { status: 404 }
            );
        }

        // Получаем public_id из URL
        const publicId = getPublicIdFromUrl(image.image_blob);

        if (publicId) {
            // Удаляем изображение из Cloudinary
            await fetch(
                process.env.NEXT_PUBLIC_URL +
                    `/api/upload?publicId=${publicId}`,
                {
                    method: "DELETE",
                }
            );
        }

        // Удаляем запись из базы данных
        await prisma.product_images.delete({
            where: { id: parseInt(imageId) },
        });

        return NextResponse.json({
            message: "Image successfully deleted from both DB and Cloudinary",
        });
    } catch (error) {
        console.error("Error deleting image:\n", error);
        return NextResponse.json(
            { error: "Failed to delete image: " + error },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}
