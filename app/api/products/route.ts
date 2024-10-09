import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const products = await prisma.products.findMany({
            include: {
                images: {
                    orderBy: {
                        id: "asc",
                    },
                },
                discounts: true,
            },
        });

        if (products.length === 0) {
            return NextResponse.json(
                { error: "No products found" },
                { status: 404 }
            );
        }

        // Формируем массив результатов
        const results = products.map((product) => {
            // Проверяем, есть ли действующая скидка
            const currentDate = new Date();
            const activeDiscount = product.discounts.findLast(
                (discount) =>
                    discount.start_date <= currentDate &&
                    discount.end_date >= currentDate
            );

            return {
                id: product.id,
                name: product.name,
                price: product.price,
                discount: activeDiscount ? activeDiscount.new_price : undefined,
                description: product.description,
                stock_quantity: product.stock_quantity,
                sku_code: product.sku_code,
                created_at: product.created_at,
                imageUrl:
                    product.images.length > 0
                        ? product.images[0].image_blob
                        : "/noPhoto.png",
            };
        });

        return NextResponse.json(results);
    } catch (error) {
        console.error("Error fetching products:", error);
        return NextResponse.json(
            { error: "Error fetching products" },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}
