import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const revalidate = process.env.NEXT_PUBLIC_REVALIDATE
    ? +process.env.NEXT_PUBLIC_REVALIDATE
    : 60;

export async function GET(request: Request) {
    const url = new URL(request.url);
    const idsPart = url.searchParams.get("ids");

    if (!idsPart) {
        return NextResponse.json(
            { error: "At least one valid Product ID is required" },
            { status: 400 }
        );
    }

    const ids = idsPart
        .split(",")
        .map((id) => parseInt(id))
        .filter((id) => !isNaN(id));

    if (ids.length === 0) {
        return NextResponse.json(
            { error: "At least one valid Product ID is required" },
            { status: 400 }
        );
    }

    try {
        const products = await prisma.products.findMany({
            where: {
                id: {
                    in: ids,
                },
            },
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
                { error: "No products found for the given IDs" },
                { status: 404 }
            );
        }

        const results = products.map((product) => {
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
