// app/api/posts/route.js
// 90 possible combinations (after applying ordering & exclusion rules)
// (Note: Depending on interpretation you mentioned 103; adjust ranges if needed.)
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

// Helper: Fisher–Yates shuffle to randomize an array in place
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Pre-generate all valid Pick 4 combinations given your rules.
// Allowed digit ranges are:
//   first:  0–2
//   second: 2–5
//   third:  4–7
//   fourth: 7–9
// And the digits must be strictly ascending.
function generateAllCombinationsPick4(excludedNumbers) {
    const combinations = [];
    for (let first = 0; first <= 2; first++) {
        if (isExcluded(first, 0, excludedNumbers)) continue;
        for (let second = 2; second <= 5; second++) {
            if (isExcluded(second, 1, excludedNumbers)) continue;
            for (let third = 4; third <= 7; third++) {
                if (isExcluded(third, 2, excludedNumbers)) continue;
                for (let fourth = 7; fourth <= 9; fourth++) {
                    if (isExcluded(fourth, 3, excludedNumbers)) continue;
                    if (first < second && second < third && third < fourth) {
                        combinations.push([first, second, third, fourth]);
                    }
                }
            }
        }
    }
    return combinations;
}

// Generate draws by selecting from the pre-generated pool while ensuring that
// no digit is re-used in the same position across different draws.
function generateDraws(numberOfDraws = 5, latestDraw, excludedNumbers) {
    // Build the full pool of valid combinations and randomize it.
    let pool = generateAllCombinationsPick4(excludedNumbers);
    pool = shuffle(pool);

    const selectedDraws = [];
    // Sets to track which digits have been used in each position.
    const usedFirstNumbers = new Set();
    const usedSecondNumbers = new Set();
    const usedThirdNumbers = new Set();
    const usedFourthNumbers = new Set();

    while (selectedDraws.length < numberOfDraws && pool.length > 0) {
        // Find the index of the first candidate that does not conflict with previously used digits.
        const candidateIndex = pool.findIndex(draw => {
            const [first, second, third, fourth] = draw;
            return !usedFirstNumbers.has(first) &&
                !usedSecondNumbers.has(second) &&
                !usedThirdNumbers.has(third) &&
                !usedFourthNumbers.has(fourth);
        });

        if (candidateIndex === -1) break; // No candidate remains that meets the uniqueness rules.

        // Select and remove the candidate from the pool.
        const candidate = pool[candidateIndex];
        pool.splice(candidateIndex, 1);
        selectedDraws.push(candidate);

        // Mark the candidate digits as used.
        usedFirstNumbers.add(candidate[0]);
        usedSecondNumbers.add(candidate[1]);
        usedThirdNumbers.add(candidate[2]);
        usedFourthNumbers.add(candidate[3]);

        // Optionally, filter out remaining combinations that conflict with the used digits.
        pool = pool.filter(draw => {
            const [first, second, third, fourth] = draw;
            return !usedFirstNumbers.has(first) &&
                !usedSecondNumbers.has(second) &&
                !usedThirdNumbers.has(third) &&
                !usedFourthNumbers.has(fourth);
        });
    }

    return selectedDraws;
}

// Modified POST handler for generating Pick 4 draws using pre-generated combinations.
export async function POST(req) {
    try {
        const [prevMonth, currentMonth] = getMonths();
        const firestore = adminDb.firestore();
        const body = await req.json();

        // Ensure excludedNumbers contains arrays for all four positions.
        const excludedNumbersInput = body.excludedNumbers || {};
        const excludedNumbers = {
            first: excludedNumbersInput.first || [],
            second: excludedNumbersInput.second || [],
            third: excludedNumbersInput.third || [],
            fourth: excludedNumbersInput.fourth || [],
        };

        // Query for draws from the current and previous months.
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
        // Collect all draws and tag them with a monthOrder for sorting.
        snapshot.forEach((doc) => {
            const drawData = doc.data();
            drawData.id = doc.id;
            drawData.monthOrder = drawData.drawMonth === currentMonth ? 1 : 2;
            allDraws.push(drawData);
        });

        // Sort the draws by monthOrder and then by index (descending).
        allDraws.sort((a, b) => {
            if (a.monthOrder !== b.monthOrder) {
                return a.monthOrder - b.monthOrder;
            }
            return b.index - a.index;
        });

        // (Optional) Use the latest 4 draws if needed for context.
        const draws = allDraws.slice(0, 4);

        // Generate Pick4 draws based on the latest draw and provided exclusions.
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

