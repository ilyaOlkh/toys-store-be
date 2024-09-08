import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();



export async function GET() {
    try {
        const types = await prisma.types.findMany();
        return NextResponse.json(types);
    } catch (error) {
        console.error('Error fetching types:', error);
        return NextResponse.json({ error: 'Error fetching types' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}