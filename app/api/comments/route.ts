import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

// Helper function to get user from Auth0 session cookie
async function getUserFromCookie(request: NextRequest) {
    try {
        console.log(1);

        const appSession = request.cookies.get("appSession")?.value;
        console.log(2);

        console.log(request.cookies.getAll());

        if (!appSession) {
            return null;
        }
        console.log(`${process.env.URL}/api/auth/me`);
        const response = await axios.get(`${process.env.URL}/api/auth/me`, {
            headers: {
                Cookie: `appSession=${appSession}`,
            },
        });
        console.log(3);
        console.log(response.data);

        return response.data;
    } catch (error) {
        console.log(4);

        console.error("Error getting user from cookie:", error);
        return null;
    }
}

// Helper function to check if user is admin
async function isAdmin(userId: string) {
    try {
        const response = await axios.get(
            `${process.env.URL}/api/user/roles?userId=${userId}`
        );
        return response.data.roles.some(
            (role: { name: string }) => role.name === "admin"
        );
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}

// GET all comments for a product
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get("productId");

        if (!productId) {
            return NextResponse.json(
                { error: "Product ID is required" },
                { status: 400 }
            );
        }

        const comments = await prisma.comments.findMany({
            where: {
                product_id: parseInt(productId),
            },
            orderBy: {
                created_at: "desc",
            },
        });

        return NextResponse.json(comments);
    } catch (error) {
        console.error("Error fetching comments:", error);
        return NextResponse.json(
            { error: "Failed to fetch comments" },
            { status: 500 }
        );
    }
}

// POST new comment
export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromCookie(request);
        if (!user) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        const { product_id, comment, rating } = await request.json();

        if (!product_id || !comment || rating === undefined) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const newComment = await prisma.comments.create({
            data: {
                product_id: parseInt(product_id),
                user_identifier: user.sub,
                comment,
                rating: parseFloat(rating),
                created_at: new Date(),
            },
        });

        return NextResponse.json(newComment, { status: 201 });
    } catch (error) {
        console.error("Error creating comment:", error);
        return NextResponse.json(
            { error: "Failed to create comment" },
            { status: 500 }
        );
    }
}

// PATCH update comment
export async function PATCH(request: NextRequest) {
    try {
        const user = await getUserFromCookie(request);
        if (!user) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        const { id, comment, rating } = await request.json();

        // Check if comment exists and belongs to user
        const existingComment = await prisma.comments.findUnique({
            where: { id: parseInt(id) },
        });

        if (!existingComment) {
            return NextResponse.json(
                { error: "Comment not found" },
                { status: 404 }
            );
        }

        if (existingComment.user_identifier !== user.sub) {
            return NextResponse.json(
                { error: "Not authorized to edit this comment" },
                { status: 403 }
            );
        }

        const updatedComment = await prisma.comments.update({
            where: { id: parseInt(id) },
            data: {
                comment: comment,
                rating: rating ? parseFloat(rating) : undefined,
                edited_at: new Date(),
            },
        });

        return NextResponse.json(updatedComment);
    } catch (error) {
        console.error("Error updating comment:", error);
        return NextResponse.json(
            { error: "Failed to update comment" },
            { status: 500 }
        );
    }
}

// DELETE comment
export async function DELETE(request: NextRequest) {
    try {
        const user = await getUserFromCookie(request);
        if (!user) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const commentId = searchParams.get("id");

        if (!commentId) {
            return NextResponse.json(
                { error: "Comment ID is required" },
                { status: 400 }
            );
        }

        // Check if comment exists
        const existingComment = await prisma.comments.findUnique({
            where: { id: parseInt(commentId) },
        });

        if (!existingComment) {
            return NextResponse.json(
                { error: "Comment not found" },
                { status: 404 }
            );
        }

        // Check if user is admin or comment owner
        const userIsAdmin = await isAdmin(user.sub);
        if (!userIsAdmin && existingComment.user_identifier !== user.sub) {
            return NextResponse.json(
                { error: "Not authorized to delete this comment" },
                { status: 403 }
            );
        }

        await prisma.comments.delete({
            where: { id: parseInt(commentId) },
        });

        return NextResponse.json(
            { message: "Comment deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error deleting comment:", error);
        return NextResponse.json(
            { error: "Failed to delete comment" },
            { status: 500 }
        );
    }
}
