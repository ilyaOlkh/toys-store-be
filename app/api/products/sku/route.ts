import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');

    if (!sku) {
        return NextResponse.json(
            { error: 'SKU parameter is required.' },
            { status: 400 }
        );
    }

    try {
        const product = await prisma.products.findUnique({
            where: { sku_code: sku },
        });

        if (product) {
            return NextResponse.json({ exists: true });
        } else {
            return NextResponse.json({ exists: false });
        }
    } catch (error) {
        console.error('Error checking SKU\n', error);
        return NextResponse.json(
            { error: 'Error checking SKU.' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}