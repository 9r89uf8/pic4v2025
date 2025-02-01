// app/api/posts/route.js
// 90 possible combinations (after applying ordering & exclusion rules)
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
    if (position === 3) return excludedNumbers.fourth ? excludedNumbers.fourth.includes(num) : false;
    return false;
}

function generateDraws(numberOfDraws = 5, latestDraw, excludedNumbers) {
    // Used sets for ensuring that no number is re-used in the same digit position.
    const usedFirstNumbers = new Set();
    const usedSecondNumbers = new Set();
    const usedThirdNumbers = new Set();
    const usedFourthNumbers = new Set();
    const draws = [];

    function isValidDraw(draw) {
        const [first, second, third, fourth] = draw;

        // Check against any excluded numbers provided
        for (let i = 0; i < 4; i++) {
            if (isExcluded(draw[i], i, excludedNumbers)) return false;
        }

        // Ensure all four digits are distinct
        if (new Set(draw).size !== 4) return false;

        // Validate digit ranges
        if (!(first >= 0 && first <= 2)) return false;
        if (!(second >= 2 && second <= 5)) return false;
        if (!(third >= 4 && third <= 7)) return false;
        if (!(fourth >= 7 && fourth <= 9)) return false;

        // Ensure the numbers are in strictly ascending order
        if (!(first < second && second < third && third < fourth)) return false;

        // Ensure numbers have not been used in the same position before
        if (usedFirstNumbers.has(first)) return false;
        if (usedSecondNumbers.has(second)) return false;
        if (usedThirdNumbers.has(third)) return false;
        if (usedFourthNumbers.has(fourth)) return false;

        return true;
    }

    function generateSingleDraw() {
        const maxAttempts = 1000;
        let attempts = 0;

        while (attempts < maxAttempts) {
            // Generate each digit according to the new ranges:
            const first = Math.floor(Math.random() * 3);         // 0-2
            const second = Math.floor(Math.random() * 4) + 2;      // 2-5
            const third = Math.floor(Math.random() * 4) + 4;       // 4-7
            const fourth = Math.floor(Math.random() * 3) + 7;      // 7-9

            const draw = [first, second, third, fourth];

            if (isValidDraw(draw)) {
                usedFirstNumbers.add(first);
                usedSecondNumbers.add(second);
                usedThirdNumbers.add(third);
                usedFourthNumbers.add(fourth);
                return draw;
            }
            attempts++;
        }

        return null; // Could not generate a valid draw
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

// Modified POST handler for generating pick4 draws
export async function POST(req) {
    try {
        const [prevMonth, currentMonth] = getMonths();
        const firestore = adminDb.firestore();
        const body = await req.json();

        // Ensure excludedNumbers includes keys for all four positions.
        const excludedNumbersInput = body.excludedNumbers || {};
        const excludedNumbers = {
            first: excludedNumbersInput.first || [],
            second: excludedNumbersInput.second || [],
            third: excludedNumbersInput.third || [],
            fourth: excludedNumbersInput.fourth || [],
        };

        // Query for draws from the current and previous months
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

        // Collect all draws, tagging them with a month order for sorting
        snapshot.forEach((doc) => {
            const drawData = doc.data();
            drawData.id = doc.id;
            drawData.monthOrder = drawData.drawMonth === currentMonth ? 1 : 2;
            allDraws.push(drawData);
        });

        // Sort the draws first by month order and then by index (descending)
        allDraws.sort((a, b) => {
            if (a.monthOrder !== b.monthOrder) {
                return a.monthOrder - b.monthOrder;
            }
            return b.index - a.index;
        });

        // Get the latest 4 draws from the sorted list (if needed for context)
        const draws = allDraws.slice(0, 4);

        // Generate Pick 4 draws based on the latest draw and provided exclusions
        const generatedDraws = generateDraws(3, draws[0], excludedNumbers);

        return new Response(JSON.stringify(generatedDraws), {
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
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
