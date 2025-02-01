// app/api/posts/route.js
// 540 possible combinations
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
// (Updated here for 4-digit draws)
function hasExcludedNumbers(draw, excludedNumbers) {
    if (excludedNumbers.first.includes(draw[0])) return true;
    if (excludedNumbers.second.includes(draw[1])) return true;
    if (excludedNumbers.third.includes(draw[2])) return true;
    if (excludedNumbers.fourth && excludedNumbers.fourth.includes(draw[3])) return true;
    return false;
}

// ===========================================================
// The MAIN generator that enforces a set of permutations and no reuse in the same position
// for Pick4 draws
// ===========================================================
function generateDraws(latestDraw, last50Combinations, excludedNumbers = { first: [], second: [], third: [], fourth: [] }) {
    /*
      For Pick4, we define 4 categories:
        A: [0, 1, 2]       (for first digit)
        B: [2, 3, 4, 5]    (for second digit)
        C: [4, 5, 6, 7]    (for third digit)
        D: [7, 8, 9]       (for fourth digit)

      We choose 6 permutations (one per draw) from these four categories. For example:
         1) [A, B, C, D]
         2) [A, B, D, C]
         3) [A, C, B, D]
         4) [B, A, C, D]
         5) [B, C, A, D]
         6) [C, A, B, D]

      For each permutation, we randomly pick one number from the designated set. We then:
        - Check that all four digits are distinct.
        - Ensure that for each final position (i.e. column 0, 1, 2, 3) the chosen digit has not been used in a previous draw.
        - Check that no digit in a given position is in the excluded list.
    */
    const A_vals = [0, 1, 2];
    const B_vals = [2, 3, 4, 5];
    const C_vals = [4, 5, 6, 7];
    const D_vals = [7, 8, 9];

    const permutations = [
        ["A", "B", "C", "D"],
        ["A", "B", "D", "C"],
        ["A", "C", "B", "D"],
        ["B", "A", "C", "D"],
        ["B", "C", "A", "D"],
        ["C", "A", "B", "D"],
    ];

    // Track used numbers for each final position (positions 0,1,2,3)
    const usedInPosition = [new Set(), new Set(), new Set(), new Set()];

    const draws = [];
    const MAX_ATTEMPTS = 2000;
    let attempts = 0;

    function pickRandom(arr) {
        const idx = Math.floor(Math.random() * arr.length);
        return arr[idx];
    }

    for (let permIndex = 0; permIndex < permutations.length; permIndex++) {
        const [pos1Cat, pos2Cat, pos3Cat, pos4Cat] = permutations[permIndex];
        let foundValid = false;

        for (let localTry = 0; localTry < 500; localTry++) {
            let val1, val2, val3, val4;

            if (pos1Cat === "A") val1 = pickRandom(A_vals);
            if (pos1Cat === "B") val1 = pickRandom(B_vals);
            if (pos1Cat === "C") val1 = pickRandom(C_vals);
            if (pos1Cat === "D") val1 = pickRandom(D_vals);

            if (pos2Cat === "A") val2 = pickRandom(A_vals);
            if (pos2Cat === "B") val2 = pickRandom(B_vals);
            if (pos2Cat === "C") val2 = pickRandom(C_vals);
            if (pos2Cat === "D") val2 = pickRandom(D_vals);

            if (pos3Cat === "A") val3 = pickRandom(A_vals);
            if (pos3Cat === "B") val3 = pickRandom(B_vals);
            if (pos3Cat === "C") val3 = pickRandom(C_vals);
            if (pos3Cat === "D") val3 = pickRandom(D_vals);

            if (pos4Cat === "A") val4 = pickRandom(A_vals);
            if (pos4Cat === "B") val4 = pickRandom(B_vals);
            if (pos4Cat === "C") val4 = pickRandom(C_vals);
            if (pos4Cat === "D") val4 = pickRandom(D_vals);

            const candidate = [val1, val2, val3, val4];

            // Check distinctness
            if (hasRepeatingNumbers(candidate)) continue;

            // Check if numbers are already used in the same final position
            if (usedInPosition[0].has(val1)) continue;
            if (usedInPosition[1].has(val2)) continue;
            if (usedInPosition[2].has(val3)) continue;
            if (usedInPosition[3].has(val4)) continue;

            // Check excluded numbers by position
            if (hasExcludedNumbers(candidate, excludedNumbers)) continue;

            // Accept candidate draw
            draws.push(candidate);
            usedInPosition[0].add(val1);
            usedInPosition[1].add(val2);
            usedInPosition[2].add(val3);
            usedInPosition[3].add(val4);
            foundValid = true;
            break;
        }
        if (!foundValid) {
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

// ===========================================================
// Function to generate extra draws with modified constraints for Pick4
// ===========================================================
function generateExtraDraws(latestDraw, last50Combinations, excludedNumbers = { first: [], second: [], third: [], fourth: [] }, usedPositions) {
    /*
      For extra draws we use a pool of extra permutations for 4-digit draws.
      We enforce:
        - All four digits are distinct.
        - No reuse of a digit in the same final position (tracked via usedPositions, an array of 4 sets).
        - The candidate does not contain any excluded numbers.
    */
    const A_vals = [0, 1, 2];
    const B_vals = [2, 3, 4, 5];
    const C_vals = [4, 5, 6, 7];
    const D_vals = [7, 8, 9];

    const extraPermutations = [
        ["A", "B", "D", "C"],
        ["A", "C", "D", "B"],
        ["B", "A", "D", "C"],
        ["B", "D", "A", "C"],
        ["C", "A", "D", "B"],
        ["C", "D", "A", "B"],
        ["D", "A", "B", "C"],
        ["D", "B", "A", "C"],
    ];

    // Track overall number usage from usedPositions (for each position)
    const numberUsage = {};
    for (let pos = 0; pos < 4; pos++) {
        for (let num of usedPositions[pos]) {
            numberUsage[num] = (numberUsage[num] || 0) + 1;
        }
    }

    // Create a local copy of used positions for extra draws
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

    function candidateHasExcluded(candidate, excludedNumbers) {
        if (excludedNumbers.first.includes(candidate[0])) return true;
        if (excludedNumbers.second.includes(candidate[1])) return true;
        if (excludedNumbers.third.includes(candidate[2])) return true;
        if (excludedNumbers.fourth && excludedNumbers.fourth.includes(candidate[3])) return true;
        return false;
    }

    const extraDraws = [];
    const MAX_ATTEMPTS = 1000;
    const selectedPermutations = [];

    while (selectedPermutations.length < 2) {
        const randomIndex = Math.floor(Math.random() * extraPermutations.length);
        const perm = extraPermutations[randomIndex];
        if (!selectedPermutations.some(p =>
            p[0] === perm[0] && p[1] === perm[1] && p[2] === perm[2] && p[3] === perm[3]
        )) {
            selectedPermutations.push(perm);
        }
    }

    for (const [pos1Cat, pos2Cat, pos3Cat, pos4Cat] of selectedPermutations) {
        let attempts = 0;
        let foundValid = false;

        while (attempts < MAX_ATTEMPTS && !foundValid) {
            let val1, val2, val3, val4;
            const usedInThisDraw = [];

            if (pos1Cat === "A") val1 = pickRandom(A_vals);
            if (pos1Cat === "B") val1 = pickRandom(B_vals);
            if (pos1Cat === "C") val1 = pickRandom(C_vals);
            if (pos1Cat === "D") val1 = pickRandom(D_vals);
            if (val1 === null) { attempts++; continue; }
            usedInThisDraw.push(val1);

            if (pos2Cat === "A") val2 = pickRandom(A_vals, usedInThisDraw);
            if (pos2Cat === "B") val2 = pickRandom(B_vals, usedInThisDraw);
            if (pos2Cat === "C") val2 = pickRandom(C_vals, usedInThisDraw);
            if (pos2Cat === "D") val2 = pickRandom(D_vals, usedInThisDraw);
            if (val2 === null) { attempts++; continue; }
            usedInThisDraw.push(val2);

            if (pos3Cat === "A") val3 = pickRandom(A_vals, usedInThisDraw);
            if (pos3Cat === "B") val3 = pickRandom(B_vals, usedInThisDraw);
            if (pos3Cat === "C") val3 = pickRandom(C_vals, usedInThisDraw);
            if (pos3Cat === "D") val3 = pickRandom(D_vals, usedInThisDraw);
            if (val3 === null) { attempts++; continue; }
            usedInThisDraw.push(val3);

            if (pos4Cat === "A") val4 = pickRandom(A_vals, usedInThisDraw);
            if (pos4Cat === "B") val4 = pickRandom(B_vals, usedInThisDraw);
            if (pos4Cat === "C") val4 = pickRandom(C_vals, usedInThisDraw);
            if (pos4Cat === "D") val4 = pickRandom(D_vals, usedInThisDraw);
            if (val4 === null) { attempts++; continue; }

            const candidate = [val1, val2, val3, val4];

            if (hasRepeatingNumbers(candidate)) { attempts++; continue; }

            if (!canUseNumber(val1) || positionUsage[0].has(val1)) { attempts++; continue; }
            if (!canUseNumber(val2) || positionUsage[1].has(val2)) { attempts++; continue; }
            if (!canUseNumber(val3) || positionUsage[2].has(val3)) { attempts++; continue; }
            if (!canUseNumber(val4) || positionUsage[3].has(val4)) { attempts++; continue; }

            if (candidateHasExcluded(candidate, excludedNumbers)) { attempts++; continue; }

            extraDraws.push(candidate);
            numberUsage[val1] = (numberUsage[val1] || 0) + 1;
            numberUsage[val2] = (numberUsage[val2] || 0) + 1;
            numberUsage[val3] = (numberUsage[val3] || 0) + 1;
            numberUsage[val4] = (numberUsage[val4] || 0) + 1;

            positionUsage[0].add(val1);
            positionUsage[1].add(val2);
            positionUsage[2].add(val3);
            positionUsage[3].add(val4);

            foundValid = true;
        }
        if (!foundValid) {
            throw new Error(`Could not generate valid extra draw after ${MAX_ATTEMPTS} attempts`);
        }
    }

    return extraDraws;
}

// ===========================================================
// Modified POST handler
// ===========================================================
export async function POST(req) {
    try {
        // Expect excludedNumbers to include keys: first, second, third, fourth
        const { excludedNumbers = { first: [], second: [], third: [], fourth: [] } } = await req.json();
        const month = getCurrentMonth();
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
            return [
                data.originalFirstNumber,
                data.originalSecondNumber,
                data.originalThirdNumber,
                data.originalFourthNumber
            ];
        });

        // Generate the main 6 draws
        const main6 = generateDraws(latestDraw, last50Combinations, excludedNumbers);

        // Track used positions from main6 (for 4-digit draws, we have 4 sets)
        const usedPositions = [new Set(), new Set(), new Set(), new Set()];
        main6.forEach(draw => {
            usedPositions[0].add(draw[0]);
            usedPositions[1].add(draw[1]);
            usedPositions[2].add(draw[2]);
            usedPositions[3].add(draw[3]);
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
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
