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

        // Форматируем ответ аналогично favorites API
        const formattedCartItems = cartItems.map((item) => {
            const product = item.product;
            const currentDate = new Date();
            const activeDiscount = product.discounts.findLast(
                (discount) =>
                    discount.start_date <= currentDate &&
                    discount.end_date >= currentDate
            );

            return {
                id: item.id,
                product_id: item.product_id,
                user_identifier: item.user_identifier,
                quantity: item.quantity,
                product: {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    discount: activeDiscount
                        ? activeDiscount.new_price
                        : undefined,
                    description: product.description,
                    stock_quantity: product.stock_quantity,
                    sku_code: product.sku_code,
                    created_at: product.created_at,
                    imageUrl:
                        product.images.length > 0
                            ? product.images[0].image_blob
                            : "/noPhoto.png",
                },
            };
        });

        return NextResponse.json(formattedCartItems);
    } catch (error) {
        return NextResponse.json(
            { error: "Error fetching cart items" },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
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
        const cartItemWithProduct = await prisma.cart.create({
            data: {
                user_identifier,
                product_id,
                quantity,
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

        const product = cartItemWithProduct.product;
        const currentDate = new Date();
        const activeDiscount = product.discounts.findLast(
            (discount) =>
                discount.start_date <= currentDate &&
                discount.end_date >= currentDate
        );

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
                id: cartItemWithProduct.id,
                product_id: cartItemWithProduct.product_id,
                user_identifier: cartItemWithProduct.user_identifier,
                quantity: cartItemWithProduct.quantity,
                product: productInfo,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error adding to cart:", error);
        return NextResponse.json(
            { error: "Error adding to cart" },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}

// Обновление количества товара в корзине
export async function PATCH(req: NextRequest) {
    const { cartItemId, quantity } = await req.json();

    if (!cartItemId || !quantity) {
        return NextResponse.json(
            { error: "cartItemId and quantity are required" },
            { status: 400 }
        );
    }

    if (quantity < 1) {
        return NextResponse.json(
            { error: "Quantity must be greater than 0" },
            { status: 400 }
        );
    }

    try {
        const updatedCartItem = await prisma.cart.update({
            where: { id: cartItemId },
            data: { quantity },
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

        const product = updatedCartItem.product;
        const currentDate = new Date();
        const activeDiscount = product.discounts.findLast(
            (discount) =>
                discount.start_date <= currentDate &&
                discount.end_date >= currentDate
        );

        return NextResponse.json({
            id: updatedCartItem.id,
            product_id: updatedCartItem.product_id,
            user_identifier: updatedCartItem.user_identifier,
            quantity: updatedCartItem.quantity,
            product: {
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
            },
        });
    } catch (error) {
        console.error("Error updating cart item:", error);
        return NextResponse.json(
            { error: "Error updating cart item" },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}

// Удаление товара из корзины
export async function DELETE(req: NextRequest) {
    const data = await req.json();

    // Проверяем, какой тип удаления запрошен
    if ("cartItemId" in data) {
        // Удаление одного элемента
        const { cartItemId } = data;

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
            console.log(error);
            return NextResponse.json(
                { error: "Error deleting cart item" },
                { status: 500 }
            );
        }
    } else if ("user_identifier" in data) {
        // Удаление всей корзины пользователя
        const { user_identifier } = data;

        if (!user_identifier) {
            return NextResponse.json(
                { error: "user_identifier is required" },
                { status: 400 }
            );
        }

        try {
            await prisma.cart.deleteMany({
                where: { user_identifier: user_identifier },
            });
            return NextResponse.json(
                { message: "Cart cleared successfully" },
                { status: 200 }
            );
        } catch (error) {
            console.log(error);
            return NextResponse.json(
                { error: "Error clearing cart" },
                { status: 500 }
            );
        }
    } else {
        return NextResponse.json(
            { error: "Invalid request parameters" },
            { status: 400 }
        );
    }
}
