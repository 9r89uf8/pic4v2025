// app/api/posts/route.js
import { adminDb } from '@/app/utils/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const getMonths = () => {
    const currentDate = new Date();
    const currentMonthIndex = currentDate.getMonth();

    let twoMonthsAgoIndex;
    let previousMonthIndex;

    if (currentMonthIndex === 0) {
        twoMonthsAgoIndex = 10; // (Dec -> Oct)
        previousMonthIndex = 11; // (Dec -> Nov)
    } else if (currentMonthIndex === 1) {
        twoMonthsAgoIndex = 11; // (Jan -> Nov)
        previousMonthIndex = 0;  // (Jan -> Dec)
    } else {
        twoMonthsAgoIndex = currentMonthIndex - 2;
        previousMonthIndex = currentMonthIndex - 1;
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return [monthNames[previousMonthIndex], monthNames[currentMonthIndex], monthNames[twoMonthsAgoIndex]];
};

// Validate pick 4 digits
function validateFourDigits(a, b, c, d) {
    const firstNumberValid  = a >= 0 && a <= 2;   // first number between 0 and 2
    const secondNumberValid = b >= 2 && b <= 5;     // second number between 2 and 5
    const thirdNumberValid  = c >= 4 && c <= 7;     // third number between 4 and 7
    const fourthNumberValid = d >= 7 && d <= 9;       // fourth number between 7 and 9
    const uniqueCheck = (a !== b) && (a !== c) && (a !== d) &&
        (b !== c) && (b !== d) && (c !== d);

    return firstNumberValid && secondNumberValid && thirdNumberValid && fourthNumberValid && uniqueCheck;
}

export async function GET() {
    try {
        const [prevMonth, currentMonth] = getMonths();
        // Example override:
        // const currentMonth = 'Jan'
        // const prevMonth = 'Dec'

        const drawsCollectionRef = adminDb.firestore()
            .collection('draws')
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
        let totalFireballPredictions = 0;  // Counter for Fireball predictions
        let totalDraws = draws.length;

        // Update each draw document with isValid and isValidFireball
        for (let i = 0; i < draws.length; i++) {
            const draw = draws[i];
            console.log(
                `\nValidating draw: ${draw.sortedFirstNumber}, ${draw.sortedSecondNumber}, ${draw.sortedThirdNumber}, ${draw.sortedFourthNumber}`
            );

            const {
                sortedFirstNumber,
                sortedSecondNumber,
                sortedThirdNumber,
                sortedFourthNumber,
                fireball
            } = draw;

            // === Compute isValid (original pick 4 check) ===
            const isValid = validateFourDigits(sortedFirstNumber, sortedSecondNumber, sortedThirdNumber, sortedFourthNumber);
            if (isValid) {
                totalCorrectPredictions++;
                console.log('Draw passed all validations');
            } else {
                console.log('Draw failed validations');
            }

            // === Compute isValidFireball (Fireball check) ===
            let isValidFireball = false;

            if (typeof fireball === 'number') {
                // For each digit replaced by Fireball, sort them, then validate
                const replacedA = [fireball, sortedSecondNumber, sortedThirdNumber, sortedFourthNumber].sort((x, y) => x - y);
                const replacedB = [sortedFirstNumber, fireball, sortedThirdNumber, sortedFourthNumber].sort((x, y) => x - y);
                const replacedC = [sortedFirstNumber, sortedSecondNumber, fireball, sortedFourthNumber].sort((x, y) => x - y);
                const replacedD = [sortedFirstNumber, sortedSecondNumber, sortedThirdNumber, fireball].sort((x, y) => x - y);

                const checkA = validateFourDigits(replacedA[0], replacedA[1], replacedA[2], replacedA[3]);
                const checkB = validateFourDigits(replacedB[0], replacedB[1], replacedB[2], replacedB[3]);
                const checkC = validateFourDigits(replacedC[0], replacedC[1], replacedC[2], replacedC[3]);
                const checkD = validateFourDigits(replacedD[0], replacedD[1], replacedD[2], replacedD[3]);

                isValidFireball = checkA || checkB || checkC || checkD;

                if (isValidFireball) {
                    totalFireballPredictions++;
                }
            }

            // Update the draw document in Firestore
            const drawRef = adminDb.firestore().collection('draws').doc(draw.id);
            batch.update(drawRef, {
                isValid,
                isValidFireball
            });
        }

        // Create or update stats document for the current month
        const statsRef = adminDb.firestore().collection('drawStats').doc(currentMonth);
        batch.set(statsRef, {
            month: currentMonth,
            totalDraws,
            totalPassed: totalCorrectPredictions,
            totalFireballPassed: totalFireballPredictions,  // New stat
            percentage: (totalCorrectPredictions / totalDraws) * 100,
            fireballPercentage: (totalFireballPredictions / totalDraws) * 100,  // New percentage
            lastUpdated: adminDb.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        await batch.commit();

        // Read current & previous month stats
        const statsCollection = adminDb.firestore().collection('drawStats');

        const currentDoc = await statsCollection.doc(currentMonth).get();
        let currentData = currentDoc.exists ? currentDoc.data() : null;

        const prevDoc = await statsCollection.doc(prevMonth).get();
        let prevData = prevDoc.exists ? prevDoc.data() : null;

        const responsePayload = {
            currentMonth: currentData
                ? {
                    month: currentData.month,
                    totalDraws: currentData.totalDraws,
                    totalPassed: currentData.totalPassed,
                    totalFireballPassed: currentData.totalFireballPassed,  // Include in response
                    percentage: currentData.percentage,
                    fireballPercentage: currentData.fireballPercentage,    // Include in response
                }
                : null,
            previousMonth: prevData
                ? {
                    month: prevData.month,
                    totalDraws: prevData.totalDraws,
                    totalPassed: prevData.totalPassed,
                    totalFireballPassed: prevData.totalFireballPassed,     // Include in response
                    percentage: prevData.percentage,
                    fireballPercentage: prevData.fireballPercentage,       // Include in response
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



