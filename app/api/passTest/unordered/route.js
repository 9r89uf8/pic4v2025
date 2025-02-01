import {adminDb} from '@/app/utils/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const firestore = adminDb.firestore();
        const drawsCollection = firestore
            .collection("draws")
            .where('drawMonth', '==', 'Jan')
            .orderBy('index', 'desc');

        const snapshot = await drawsCollection.get();
        const draws = [];
        snapshot.forEach((doc) => {
            const drawData = doc.data();
            draws.push(drawData);
        });

        let totalCorrectPredictions = 0;
        let distributions = {
            LMH: 0,
            LHM: 0,
            MLH: 0,
            MHL: 0,
            HLM: 0,
            HML: 0
        };

        // Add counter for L positions
        let lPositions = {
            firstPosition: 0,
            secondPosition: 0,
            thirdPosition: 0
        };

        for (let i = 1; i < draws.length; i++) {
            let draw = draws[i];
            let nums = [
                draw.originalFirstNumber,
                draw.originalSecondNumber,
                draw.originalThirdNumber
            ];

            // Check for duplicates
            const uniqueNums = new Set(nums);
            if (uniqueNums.size !== nums.length) {
                continue; // Skip this draw if it contains duplicates
            }

            // Get possible ranges for each number
            let numberRanges = nums.map(num => {
                let ranges = [];
                if (num >= 0 && num <= 4) ranges.push(1);
                if (num >= 2 && num <= 7) ranges.push(2);
                if (num >= 5 && num <= 9) ranges.push(3);
                return ranges;
            });

            // Try to find valid assignments
            let rangeAssignments = new Map();
            let numberAssignments = new Map();

            function tryAssignments(index) {
                if (index === nums.length) {
                    if (rangeAssignments.size === 3 &&
                        [1, 2, 3].every(r => rangeAssignments.has(r))) {
                        // Found a valid assignment
                        let pattern = determinePattern(nums, numberAssignments);
                        distributions[pattern]++;

                        // Track L position
                        const positions = pattern.split('');
                        const lIndex = positions.indexOf('L');
                        if (lIndex === 0) lPositions.firstPosition++;
                        else if (lIndex === 1) lPositions.secondPosition++;
                        else if (lIndex === 2) lPositions.thirdPosition++;

                        return true;
                    }
                    return false;
                }

                const currentNumber = nums[index];
                const possibleRanges = numberRanges[index];

                for (const range of possibleRanges) {
                    if (!rangeAssignments.has(range)) {
                        rangeAssignments.set(range, currentNumber);
                        numberAssignments.set(currentNumber, range);

                        if (tryAssignments(index + 1)) {
                            return true;
                        }

                        rangeAssignments.delete(range);
                        numberAssignments.delete(currentNumber);
                    }
                }

                return false;
            }

            if (tryAssignments(0)) {
                totalCorrectPredictions++;
            }
        }

        function determinePattern(numbers, assignments) {
            // Create array of [number, range] pairs
            let pairs = numbers.map(num => [num, assignments.get(num)]);

            // Convert ranges to L/M/H
            let positions = pairs.map(([num, range]) => {
                if (range === 1) return 'L';
                if (range === 2) return 'M';
                if (range === 3) return 'H';
                return '';
            });

            // Join to create pattern string
            return positions.join('');
        }

        const result = {
            totalDraws: draws.length,
            correctPredictions: totalCorrectPredictions,
            distributions: distributions,
            lPositions: lPositions  // Add L positions to the result
        };
        console.log(result)

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (error) {
        console.log(error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}