// app/api/posts/route.js
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/utils/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const firestore = adminDb.firestore();

        // Get the current month's short name (e.g., "Jan", "Feb", "Mar", etc.)
        const currentDate = new Date();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // Current month (0-based index)
        const currentMonthIndex = currentDate.getMonth();
        const currentMonth = monthNames[currentMonthIndex];

        // Previous month, with wrap-around if currentMonth is "Jan"
        const prevMonthIndex = (currentMonthIndex + 12 - 1) % 12;
        const previousMonth = monthNames[prevMonthIndex];

        // Fetch current month stats
        const currentMonthRef = firestore.collection('drawStats').doc(currentMonth);
        const currentSnap = await currentMonthRef.get();

        // Fetch previous month stats
        const previousMonthRef = firestore.collection('drawStats').doc(previousMonth);
        const previousSnap = await previousMonthRef.get();

        // If current month doc doesn't exist, throw an error or handle accordingly
        if (!currentSnap.exists) {
            return new Response(
                JSON.stringify({ error: `No stats found for ${currentMonth}.` }),
                {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }

        // Build the response object
        const responseData = {
            currentMonth: {
                month: currentMonth,
                ...currentSnap.data(),
            },
            previousMonth: previousSnap.exists
                ? { month: previousMonth, ...previousSnap.data() }
                : null,
        };

        return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

