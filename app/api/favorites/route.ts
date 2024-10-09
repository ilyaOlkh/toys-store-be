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
        const favorite = await prisma.favorites.create({
            data: {
                user_identifier,
                product_id,
            },
        });
        return NextResponse.json(favorite, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: "Error adding favorite" },
            { status: 500 }
        );
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
