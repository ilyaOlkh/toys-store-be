import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
        console.log(product.id, filePath)

        // Сохраняем путь к изображению в базе данных
        await prisma.product_images.create({
            data: {
                product_id: product.id,
                image_blob: filePath,
            },
        });

        return NextResponse.json({
            message: 'File path saved to DB',
        });
    } catch (error) {
        console.error("Error saving file path to DB\n", error);
        return NextResponse.json(
            { error: "Something went wrong while saving file path to DB: " + error },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}
