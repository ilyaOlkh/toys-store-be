import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop(); // Извлекаем ID из URL

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    try {
        const type = await prisma.types.findUnique({
            where: { id: parseInt(id) },
        });

        if (!type) {
            return NextResponse.json({ error: 'Type not found' }, { status: 404 });
        }

        return NextResponse.json(type);
    } catch (error) {
        console.error('Error fetching type:', error);
        return NextResponse.json({ error: 'Error fetching type' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}