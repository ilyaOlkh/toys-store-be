import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const revalidate = process.env.NEXT_PUBLIC_REVALIDATE
    ? +process.env.NEXT_PUBLIC_REVALIDATE
    : 60;

export const dynamicParams = true;

export async function GET(request: Request) {
    const url = new URL(request.url);
    const id = url.pathname.split("/").pop(); // Извлекаем ID из URL

    if (!id) {
        return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    try {
        const product = await prisma.products.findUnique({
            where: {
                id: parseInt(id),
            },
            include: {
                // Получаем все изображения продукта
                images: {
                    orderBy: {
                        id: "asc",
                    },
                },
                // Получаем активные скидки
                discounts: {
                    where: {
                        start_date: {
                            lte: new Date(),
                        },
                        end_date: {
                            gte: new Date(),
                        },
                    },
                },
                // Получаем типы продукта через связующую таблицу
                types: {
                    include: {
                        type: true,
                    },
                },
                // Получаем теги продукта через связующую таблицу
                tags: {
                    include: {
                        tag: true,
                    },
                },
                // Получаем комментарии к продукту
                comments: {
                    orderBy: {
                        created_at: "desc",
                    },
                },
            },
        });

        if (!product) {
            return NextResponse.json(
                { error: "Product not found" },
                { status: 404 }
            );
        }

        // Форматируем данные для ответа
        const formattedProduct = {
            id: product.id,
            name: product.name,
            price: product.price,
            description: product.description,
            stock_quantity: product.stock_quantity,
            sku_code: product.sku_code,
            created_at: product.created_at,
            // Форматируем текущую скидку, если есть активная
            current_discount:
                product.discounts[0]?.new_price ?? product.discount,
            // Массив всех изображений продукта
            images: product.images.map((img) => ({
                id: img.id,
                url: img.image_blob,
            })),
            // Типы продукта
            types: product.types.map((typeRelation) => ({
                id: typeRelation.type.id,
                name: typeRelation.type.name,
                image: typeRelation.type.image_blob,
            })),
            // Теги продукта
            tags: product.tags.map((tagRelation) => ({
                id: tagRelation.tag.id,
                name: tagRelation.tag.name,
            })),
            // Отзывы
            comments: product.comments.map((comment) => ({
                id: comment.id,
                user_identifier: comment.user_identifier,
                comment: comment.comment,
                rating: comment.rating,
                created_at: comment.created_at,
            })),
            // Средний рейтинг
            average_rating:
                product.comments.length > 0
                    ? product.comments.reduce(
                          (acc, comment) => acc + comment.rating,
                          0
                      ) / product.comments.length
                    : 0,
        };

        return NextResponse.json(formattedProduct);
    } catch (error) {
        console.error("Error fetching product:", error);
        return NextResponse.json(
            { error: "Error fetching product" },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}
