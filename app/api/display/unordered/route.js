import {adminDb} from '@/app/utils/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const getMonths = () => {
    const currentDate = new Date();
    const currentMonthIndex = currentDate.getMonth();

    let twoMonthsAgoIndex;
    let previousMonthIndex;

    if (currentMonthIndex === 0) {
        twoMonthsAgoIndex = 10;
        previousMonthIndex = 11;
    } else if (currentMonthIndex === 1) {
        twoMonthsAgoIndex = 11;
        previousMonthIndex = 0;
    } else {
        twoMonthsAgoIndex = currentMonthIndex - 2;
        previousMonthIndex = currentMonthIndex - 1;
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return [monthNames[previousMonthIndex], monthNames[currentMonthIndex], monthNames[twoMonthsAgoIndex]];
};

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

function isValidDraw(draw) {
    let nums = [
        draw.originalFirstNumber,
        draw.originalSecondNumber,
        draw.originalThirdNumber
    ];

    // Check for duplicate numbers
    const uniqueNums = new Set(nums);
    if (uniqueNums.size !== nums.length) {
        return { isValid: false, pattern: null };
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
    let pattern = null;

    function tryAssignments(index) {
        if (index === nums.length) {
            if (rangeAssignments.size === 3 &&
                [1, 2, 3].every(r => rangeAssignments.has(r))) {
                pattern = determinePattern(nums, numberAssignments);
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

    const isValid = tryAssignments(0);
    return { isValid, pattern };
}

export async function GET() {
    try {
        const [prevMonth, currentMonth] = getMonths();
        const drawsCollectionRef = adminDb.firestore().collection('draws')
            .where('drawMonth', '==', currentMonth)
            .orderBy('index', 'desc');
        const snapshot = await drawsCollectionRef.get();
        const draws = [];
        const batch = adminDb.firestore().batch();

        snapshot.forEach((doc) => {
            draws.push({
                id: doc.id,
                ...doc.data()
            });
        });

        let totalCorrectPredictions = 0;
        let totalDraws = draws.length;
        let distributions = {
            LMH: 0,
            LHM: 0,
            MLH: 0,
            MHL: 0,
            HLM: 0,
            HML: 0
        };

        // Update each draw document with isValid flag and pattern
        for (let i = 0; i < draws.length; i++) {
            let draw = draws[i];
            const { isValid, pattern } = isValidDraw(draw);

            if (isValid) {
                console.log(draw.originalDraw)
                totalCorrectPredictions++;
                distributions[pattern]++;
            }

            // Update the draw document
            const drawRef = adminDb.firestore().collection('draws').doc(draw.id);
            batch.update(drawRef, {
                isValid,
                pattern: isValid ? pattern : null
            });
        }

        // Create or update stats document
        const statsRef = adminDb.firestore().collection('drawStats').doc(currentMonth);
        batch.set(statsRef, {
            month: currentMonth,
            totalDraws,
            totalPassed: totalCorrectPredictions,
            percentage: (totalCorrectPredictions / totalDraws) * 100,
            distributions,
            lastUpdated: adminDb.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Commit all updates
        await batch.commit();

        // Read back the stats
        const statsCollection = adminDb.firestore().collection('drawStats');

        // 1. Current month
        const currentDoc = await statsCollection.doc(currentMonth).get();
        let currentData = null;
        if (currentDoc.exists) {
            currentData = currentDoc.data();
        }

        // 2. Previous month
        const prevDoc = await statsCollection.doc(prevMonth).get();
        let prevData = null;
        if (prevDoc.exists) {
            prevData = prevDoc.data();
        }

        // Build final response
        const responsePayload = {
            currentMonth: currentData
                ? {
                    month: currentData.month,
                    totalDraws: currentData.totalDraws,
                    totalPassed: currentData.totalPassed,
                    percentage: currentData.percentage,
                    distributions: currentData.distributions,
                }
                : null,
            previousMonth: prevData
                ? {
                    month: prevData.month,
                    totalDraws: prevData.totalDraws,
                    totalPassed: prevData.totalPassed,
                    percentage: prevData.percentage,
                    distributions: prevData.distributions,
                }
                : null,
        };

        return new Response(JSON.stringify(responsePayload), {
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