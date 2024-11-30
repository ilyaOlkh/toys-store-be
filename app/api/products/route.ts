import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const revalidate = process.env.NEXT_PUBLIC_REVALIDATE
    ? +process.env.NEXT_PUBLIC_REVALIDATE
    : 60;

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
                comments: {
                    select: {
                        rating: true,
                    },
                },
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

            // Вычисляем средний рейтинг
            const average_rating =
                product.comments.length > 0
                    ? product.comments.reduce(
                          (acc, comment) => acc + comment.rating,
                          0
                      ) / product.comments.length
                    : 0;

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
                average_rating: Number(average_rating.toFixed(1)),
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
