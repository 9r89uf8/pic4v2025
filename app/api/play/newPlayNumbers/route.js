// app/api/posts/route.js
//90 possible combinations
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/utils/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const getMonths = () => {
    const currentDate = new Date();
    const currentMonthIndex = currentDate.getMonth();

    let twoMonthsAgoIndex;
    let previousMonthIndex;

    if (currentMonthIndex === 0) {  // January
        twoMonthsAgoIndex = 10;     // November of the previous year
        previousMonthIndex = 11;    // December of the previous year
    } else if (currentMonthIndex === 1) {  // February
        twoMonthsAgoIndex = 11;     // December of the previous year
        previousMonthIndex = 0;     // January
    } else {
        twoMonthsAgoIndex = currentMonthIndex - 2;
        previousMonthIndex = currentMonthIndex - 1;
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return [monthNames[previousMonthIndex], monthNames[currentMonthIndex], monthNames[twoMonthsAgoIndex]];
};



function isExcluded(num, position, excludedNumbers) {
    if (position === 0) return excludedNumbers.first.includes(num);
    if (position === 1) return excludedNumbers.second.includes(num);
    if (position === 2) return excludedNumbers.third.includes(num);
    return false;
}

function generateDraws(numberOfDraws = 5, latestDraw, excludedNumbers) {
    const usedFirstNumbers = new Set();
    const usedSecondNumbers = new Set();
    const usedThirdNumbers = new Set();
    const draws = [];

    function isValidDraw(draw) {
        const [first, second, third] = draw;

        // Check excluded numbers
        for (let i = 0; i < 3; i++) {
            if (isExcluded(draw[i], i, excludedNumbers)) return false;
        }

        // Check for repeating numbers in the draw
        if (new Set(draw).size !== 3) return false;

        // Check if numbers are in correct ranges and order
        if (!(first >= 0 && first <= 2)) return false;
        if (!(second >= 3 && second <= 6)) return false;
        if (!(third >= 7 && third <= 9)) return false;

        // Check if numbers are in ascending order
        if (!(first < second && second < third)) return false;

        // Rule 6: if first number is 2 or 3, second number can't be 2 or 3
        // if ((first === 2) && (second === 2)) return false;
        // if ((first === 3) && (second === 3)) return false;

        // Rule 7: if second number is 6 or 7, third number can't be 6 or 7
        // if ((second === 6) && (third === 6)) return false;
        // if ((second === 7) && (third === 7)) return false;

        // Rule 8: Check if number has been used in same position before
        if (usedFirstNumbers.has(first)) return false;
        if (usedSecondNumbers.has(second)) return false;
        if (usedThirdNumbers.has(third)) return false;

        return true;
    }

    function generateSingleDraw() {
        const maxAttempts = 1000;
        let attempts = 0;

        while (attempts < maxAttempts) {
            const first = Math.floor(Math.random() * 3);    // 0-2
            const second = Math.floor(Math.random() * 4) + 3; // 3-6
            const third = Math.floor(Math.random() * 3) + 7;  // 7-9

            const draw = [first, second, third];

            if (isValidDraw(draw)) {
                usedFirstNumbers.add(first);
                usedSecondNumbers.add(second);
                usedThirdNumbers.add(third);
                return draw;
            }

            attempts++;
        }

        return null; // Could not generate valid draw
    }

    while (draws.length < numberOfDraws) {
        const draw = generateSingleDraw();
        if (draw === null) {
            break; // No more valid combinations possible
        }
        draws.push(draw);
    }

    return draws;
}


// Modified POST handler
export async function POST(req) {
    try {
        const [prevMonth, currentMonth] = getMonths();
        const firestore = adminDb.firestore();
        const { excludedNumbers = { first: [], second: [], third: [] } } = await req.json();

        // Query for current and previous month
        const drawsCollection = firestore
            .collection("draws")
            .where("drawMonth", "in", [currentMonth, prevMonth]);

        const snapshot = await drawsCollection.get();

        if (snapshot.empty) {
            return new Response(JSON.stringify({ error: "No draws found." }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const allDraws = [];

        // First pass: collect all draws with monthOrder
        snapshot.forEach((doc) => {
            const drawData = doc.data();
            drawData.id = doc.id;
            drawData.monthOrder = drawData.drawMonth === currentMonth ? 1 : 2;
            allDraws.push(drawData);
        });

        // Sort draws by monthOrder and index
        allDraws.sort((a, b) => {
            if (a.monthOrder !== b.monthOrder) {
                return a.monthOrder - b.monthOrder;
            }
            return b.index - a.index;
        });

        const draws = allDraws.slice(0, 4);
// Test the function
        const drawsS = generateDraws(3, draws[0], excludedNumbers);

        return new Response(JSON.stringify(drawsS), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (error) {
        console.error(error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            },
        });
    }
}