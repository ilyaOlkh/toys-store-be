import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const revalidate = process.env.NEXT_PUBLIC_REVALIDATE ? +process.env.NEXT_PUBLIC_REVALIDATE : 60;
export const dynamicParams = true;

export async function GET(request: Request) {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop(); // Извлекаем ID из URL

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    try {
        const product = await prisma.products.findUnique({
            where: { id: parseInt(id) },
        });

        if (!product) {
            return NextResponse.json({ error: 'product not found' }, { status: 404 });
        }

        return NextResponse.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        return NextResponse.json({ error: 'Error fetching product' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}