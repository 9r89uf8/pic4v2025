// app/api/posts/route.js
//540 possible combinations
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/utils/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const getCurrentMonth = () => {
    const currentDate = new Date();
    const currentMonthIndex = currentDate.getMonth();
    return monthNames[currentMonthIndex];
};


// Check if combination has any repeating numbers
function hasRepeatingNumbers(array) {
    return new Set(array).size !== array.length;
}



// Check if a draw contains excluded numbers (by position)
function hasExcludedNumbers(draw, excludedNumbers) {
    // Check first position
    if (excludedNumbers.first.includes(draw[0])) return true;
    // Check second position
    if (excludedNumbers.second.includes(draw[1])) return true;
    // Check third position
    if (excludedNumbers.third.includes(draw[2])) return true;
    return false;
}

// ===========================================================
// The MAIN generator that enforces the 6 permutations + no reuse in the same position
// ===========================================================
function generateDraws(latestDraw, last50Combinations, excludedNumbers = { first: [], second: [], third: [] }) {
    /*
      We want exactly 6 draws with the permutations:
         1) (L, M, H)
         2) (L, H, M)
         3) (M, L, H)
         4) (M, H, L)
         5) (H, L, M)
         6) (H, M, L)
      where:
        L in [0..3], M in [2..7], H in [6..9]

      Also, we CANNOT reuse the same number in the same position across draws.
    */

    // The sets from which we pick actual L, M, and H values:
    const L_vals = [0, 1, 2];
    const M_vals = [3, 4, 5, 6];
    const H_vals = [7, 8, 9];

    // The 6 permutations we want to fulfill exactly once each:
    const permutations = [
        ["L", "M", "H"], // #1
        ["L", "H", "M"], // #2
        ["M", "L", "H"], // #3
        ["M", "H", "L"], // #4
        ["H", "L", "M"], // #5
        ["H", "M", "L"], // #6
    ];

    // To ensure “no two draws can have the same number in the same position”:
    // We'll track used values for each column.
    const usedInPosition = [new Set(), new Set(), new Set()];

    const draws = [];
    const MAX_ATTEMPTS = 2000;
    let attempts = 0;

    // Helper to pick a random item from an array
    function pickRandom(arr) {
        const idx = Math.floor(Math.random() * arr.length);
        return arr[idx];
    }

    // For each of the 6 permutations, we attempt to find a valid triple (a,b,c).
    // We'll do a “retry” approach if we fail to find a valid assignment.
    for (let permIndex = 0; permIndex < permutations.length; permIndex++) {
        const [pos1Cat, pos2Cat, pos3Cat] = permutations[permIndex];
        let foundValid = false;

        // We try picking random values (with a limit on attempts to avoid infinite loop).
        for (let localTry = 0; localTry < 500; localTry++) {
            // 1) pick an L, M, H candidate respecting the category for each position
            let val1, val2, val3;

            // pick the correct sets for each position’s category
            if (pos1Cat === "L") val1 = pickRandom(L_vals);
            if (pos1Cat === "M") val1 = pickRandom(M_vals);
            if (pos1Cat === "H") val1 = pickRandom(H_vals);

            if (pos2Cat === "L") val2 = pickRandom(L_vals);
            if (pos2Cat === "M") val2 = pickRandom(M_vals);
            if (pos2Cat === "H") val2 = pickRandom(H_vals);

            if (pos3Cat === "L") val3 = pickRandom(L_vals);
            if (pos3Cat === "M") val3 = pickRandom(M_vals);
            if (pos3Cat === "H") val3 = pickRandom(H_vals);

            const candidate = [val1, val2, val3];

            // Check #1: distinct numbers in the triple?
            if (hasRepeatingNumbers(candidate)) continue;

            // Check #2: not used in the same position
            if (usedInPosition[0].has(val1)) continue;
            if (usedInPosition[1].has(val2)) continue;
            if (usedInPosition[2].has(val3)) continue;

            // Check #3: excluded numbers by position
            if (hasExcludedNumbers(candidate, excludedNumbers)) continue;


            // If we passed all checks, we accept this triple
            draws.push(candidate);

            // Mark used in each position
            usedInPosition[0].add(val1);
            usedInPosition[1].add(val2);
            usedInPosition[2].add(val3);

            foundValid = true;
            break; // break from the localTry loop
        }

        if (!foundValid) {
            // If we fail to find a valid triple for this permutation, we can either:
            // a) Throw an error
            // b) Clear everything and re-try from scratch
            // For simplicity, let's throw an error:
            throw new Error(
                `Could not find a valid assignment for permutation #${permIndex + 1} (${permutations[permIndex]})`
            );
        }

        attempts++;
        if (attempts > MAX_ATTEMPTS) {
            throw new Error("Too many attempts while generating draws.");
        }
    }

    if (draws.length < 6) {
        throw new Error('Could not generate 6 valid draws after maximum attempts.');
    }

    return draws;
}

// Function to generate extra draws with modified constraints
// Function to generate extra draws with modified constraints
function generateExtraDraws(latestDraw, last50Combinations, excludedNumbers = { first: [], second: [], third: [] }, usedPositions) {
    const L_vals = [0, 1, 2];
    const M_vals = [3, 4, 5, 6];
    const H_vals = [7, 8, 9];

    const extraPermutations = [
        ["L","M","H"],
        ["L","H","M"],
        ["H","L","M"]
    ];

    const numberUsage = {};
    for (let pos = 0; pos < 3; pos++) {
        for (let num of usedPositions[pos]) {
            numberUsage[num] = (numberUsage[num] || 0) + 1;
        }
    }

    const positionUsage = usedPositions.map(set => new Set(set));

    function pickRandom(arr, excludeValues = []) {
        const availableValues = arr.filter(val => !excludeValues.includes(val));
        if (availableValues.length === 0) return null;
        const idx = Math.floor(Math.random() * availableValues.length);
        return availableValues[idx];
    }

    function canUseNumber(num) {
        return !numberUsage[num] || numberUsage[num] < 3;
    }

    function hasExcludedNumbers(candidate, excludedNumbers) {
        return candidate[0] === excludedNumbers.first ||
            candidate[1] === excludedNumbers.second ||
            candidate[2] === excludedNumbers.third;
    }

    const extraDraws = [];
    const MAX_ATTEMPTS = 1000;

    const selectedPermutations = [];
    while (selectedPermutations.length < 2) {
        const randomIndex = Math.floor(Math.random() * extraPermutations.length);
        const perm = extraPermutations[randomIndex];
        if (!selectedPermutations.some(p =>
            p[0] === perm[0] && p[1] === perm[1] && p[2] === perm[2])) {
            selectedPermutations.push(perm);
        }
    }

    for (const [pos1Cat, pos2Cat, pos3Cat] of selectedPermutations) {
        let attempts = 0;
        let foundValid = false;

        while (attempts < MAX_ATTEMPTS && !foundValid) {
            let val1, val2, val3;
            let usedInThisDraw = [];

            // Pick values based on categories (L, M, H), excluding already used numbers in this draw
            if (pos1Cat === "L") val1 = pickRandom(L_vals);
            if (pos1Cat === "M") val1 = pickRandom(M_vals);
            if (pos1Cat === "H") val1 = pickRandom(H_vals);

            if (val1 === null) {
                attempts++;
                continue;
            }
            usedInThisDraw.push(val1);

            if (pos2Cat === "L") val2 = pickRandom(L_vals, usedInThisDraw);
            if (pos2Cat === "M") val2 = pickRandom(M_vals, usedInThisDraw);
            if (pos2Cat === "H") val2 = pickRandom(H_vals, usedInThisDraw);

            if (val2 === null) {
                attempts++;
                continue;
            }
            usedInThisDraw.push(val2);

            if (pos3Cat === "L") val3 = pickRandom(L_vals, usedInThisDraw);
            if (pos3Cat === "M") val3 = pickRandom(M_vals, usedInThisDraw);
            if (pos3Cat === "H") val3 = pickRandom(H_vals, usedInThisDraw);

            if (val3 === null) {
                attempts++;
                continue;
            }

            const candidate = [val1, val2, val3];

            // Check both position-based restrictions and overall usage
            if (!canUseNumber(val1) || !canUseNumber(val2) || !canUseNumber(val3) ||
                positionUsage[0].has(val1) || positionUsage[1].has(val2) || positionUsage[2].has(val3)) {
                attempts++;
                continue;
            }

            // Check excluded numbers
            if (hasExcludedNumbers(candidate, excludedNumbers)) {
                attempts++;
                continue;
            }

            // If all checks pass, add the draw
            extraDraws.push(candidate);

            // Update both number usage and position tracking
            numberUsage[val1] = (numberUsage[val1] || 0) + 1;
            numberUsage[val2] = (numberUsage[val2] || 0) + 1;
            numberUsage[val3] = (numberUsage[val3] || 0) + 1;

            positionUsage[0].add(val1);
            positionUsage[1].add(val2);
            positionUsage[2].add(val3);

            foundValid = true;
        }

        if (!foundValid) {
            throw new Error(`Could not generate valid extra draw after ${MAX_ATTEMPTS} attempts`);
        }
    }

    return extraDraws;
}

// Modified POST handler
export async function POST(req) {
    try {
        const { excludedNumbers = { first: [], second: [], third: [] } } = await req.json();
        let month = getCurrentMonth();
        const firestore = adminDb.firestore();

        const [latestSnapshot, last50Snapshot] = await Promise.all([
            firestore
                .collection("draws")
                .where("drawMonth", "==", month)
                .orderBy("index", "desc")
                .limit(1)
                .get(),
            firestore
                .collection("draws")
                .where("drawMonth", "==", month)
                .orderBy("index", "desc")
                .limit(50)
                .get()
        ]);

        let latestDraw = null;
        if (!latestSnapshot.empty) {
            latestDraw = latestSnapshot.docs[0].data();
        }

        const last50Combinations = last50Snapshot.docs.map(doc => {
            const data = doc.data();
            return [data.originalFirstNumber, data.originalSecondNumber, data.originalThirdNumber];
        });

        // Generate the main 6 draws
        const main6 = generateDraws(latestDraw, last50Combinations, excludedNumbers);

        // Track used positions from main6
        const usedPositions = [new Set(), new Set(), new Set()];
        main6.forEach(draw => {
            usedPositions[0].add(draw[0]);
            usedPositions[1].add(draw[1]);
            usedPositions[2].add(draw[2]);
        });

        // Generate 2 extra draws
        const extra2 = generateExtraDraws(latestDraw, last50Combinations, excludedNumbers, usedPositions);

        // Combine all draws
        const allDraws = [...main6, ...extra2];

        return new Response(JSON.stringify(allDraws), {
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