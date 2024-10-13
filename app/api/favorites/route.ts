// app/api/favorites/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Получение всех избранных товаров
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const user_identifier = searchParams.get("user_identifier");

    if (!user_identifier) {
        return NextResponse.json(
            { error: "user_identifier is required" },
            { status: 400 }
        );
    }

    try {
        const favorites = await prisma.favorites.findMany({
            where: { user_identifier },
            include: { product: true }, // Включение данных о продукте
        });
        return NextResponse.json(favorites);
    } catch (error) {
        return NextResponse.json(
            { error: "Error fetching favorites" },
            { status: 500 }
        );
    }
}

// Добавление товара в избранное
export async function POST(req: NextRequest) {
    const { user_identifier, product_id } = await req.json();

    if (!user_identifier || !product_id) {
        return NextResponse.json(
            { error: "user_identifier and product_id are required" },
            { status: 400 }
        );
    }

    try {
        // Создаем запись о любимом продукте и одновременно получаем данные о продукте
        const favoriteWithProduct = await prisma.favorites.create({
            data: {
                user_identifier,
                product_id,
            },
            include: {
                product: {
                    include: {
                        images: {
                            orderBy: {
                                id: "asc",
                            },
                        },
                        discounts: true,
                    },
                },
            },
        });

        // Получаем информацию о продукте
        const product = favoriteWithProduct.product;

        const currentDate = new Date();
        const activeDiscount = product.discounts.findLast(
            (discount) =>
                discount.start_date <= currentDate &&
                discount.end_date >= currentDate
        );

        // Формируем ответ с информацией о добавленном элементе в избранное и продукте
        const productInfo = {
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

        return NextResponse.json(
            {
                id: favoriteWithProduct.id,
                product_id: favoriteWithProduct.product_id,
                user_identifier: favoriteWithProduct.user_identifier,
                product: productInfo,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error adding favorite:", error);
        return NextResponse.json(
            { error: "Error adding favorite" },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}

// Удаление товара из избранного
export async function DELETE(req: NextRequest) {
    const { favoriteId } = await req.json();
    console.log(favoriteId);

    if (!favoriteId) {
        return NextResponse.json(
            { error: "favoriteId is required" },
            { status: 400 }
        );
    }

    try {
        await prisma.favorites.delete({
            where: { id: favoriteId },
        });
        return NextResponse.json(
            { message: "Favorite deleted" },
            { status: 200 }
        );
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: "Error deleting favorite" },
            { status: 500 }
        );
    }
}
