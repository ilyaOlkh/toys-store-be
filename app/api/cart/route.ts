// app/api/cart/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Получение всех товаров в корзине
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
        const cartItems = await prisma.cart.findMany({
            where: { user_identifier },
            include: { product: true },
        });
        return NextResponse.json(cartItems);
    } catch (error) {
        return NextResponse.json(
            { error: "Error fetching cart items" },
            { status: 500 }
        );
    }
}

// Добавление товара в корзину
export async function POST(req: NextRequest) {
    const { user_identifier, product_id, quantity } = await req.json();

    if (!user_identifier || !product_id || !quantity) {
        return NextResponse.json(
            { error: "user_identifier, product_id, and quantity are required" },
            { status: 400 }
        );
    }

    try {
        const cartItem = await prisma.cart.create({
            data: {
                user_identifier,
                product_id,
                quantity,
            },
        });
        return NextResponse.json(cartItem, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: "Error adding to cart" },
            { status: 500 }
        );
    }
}

// Удаление товара из корзины
export async function DELETE(req: NextRequest) {
    const { cartItemId } = await req.json();

    if (!cartItemId) {
        return NextResponse.json(
            { error: "cartItemId is required" },
            { status: 400 }
        );
    }

    try {
        await prisma.cart.delete({
            where: { id: cartItemId },
        });
        return NextResponse.json(
            { message: "Cart item deleted" },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: "Error deleting cart item" },
            { status: 500 }
        );
    }
}
