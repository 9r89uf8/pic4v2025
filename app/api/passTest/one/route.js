// app/api/posts/route.js
import { adminDb } from '@/app/utils/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const firestore = adminDb.firestore();

        // Query all draws for the month 'Nov' ordered by index descending
        const drawsCollection = firestore
            .collection("draws")
            .where('drawMonth', '==', 'Nov')
            .orderBy('index', 'desc');

        const snapshot = await drawsCollection.get();
        const draws = [];

        snapshot.forEach((doc) => {
            draws.push(doc.data());
        });

        let totalCorrectPredictions = 0;
        let totalFirst = 0;
        let totalSecond = 0;
        let totalThird = 0;
        let totalFourth = 0;

        // Loop over each draw to perform validations
        for (let i = 0; i < draws.length; i++) {
            const draw = draws[i];

            // Validate each condition individually
            const firstValid = (draw.sortedFirstNumber >= 0 && draw.sortedFirstNumber <= 2);
            const secondValid = (draw.sortedSecondNumber >= 2 && draw.sortedSecondNumber <= 5);
            const thirdValid = (draw.sortedThirdNumber >= 4 && draw.sortedThirdNumber <= 7);
            const fourthValid = (draw.sortedFourthNumber >= 7 && draw.sortedFourthNumber <= 9);

            // Increase individual counters if condition is met
            if (firstValid) totalFirst++;
            if (secondValid) totalSecond++;
            if (thirdValid) totalThird++;
            if (fourthValid) totalFourth++;

            // Check if all conditions are met simultaneously and also that all digits are unique
            if (firstValid && secondValid && thirdValid && fourthValid) {
                if (
                    draw.sortedFirstNumber !== draw.sortedSecondNumber &&
                    draw.sortedFirstNumber !== draw.sortedThirdNumber &&
                    draw.sortedFirstNumber !== draw.sortedFourthNumber &&
                    draw.sortedSecondNumber !== draw.sortedThirdNumber &&
                    draw.sortedSecondNumber !== draw.sortedFourthNumber &&
                    draw.sortedThirdNumber !== draw.sortedFourthNumber
                ) {
                    totalCorrectPredictions++;
                }
            }
        }

        console.log('Total draws:', draws.length);
        console.log(`All conditions met: ${totalCorrectPredictions} or ${(totalCorrectPredictions / draws.length * 100).toFixed(2)}%`);
        console.log(`First condition met: ${totalFirst}`);
        console.log(`Second condition met: ${totalSecond}`);
        console.log(`Third condition met: ${totalThird}`);
        console.log(`Fourth condition met: ${totalFourth}`);

        return new Response(JSON.stringify({
            totalDraws: draws.length,
            allConditionsMet: totalCorrectPredictions,
            firstConditionMet: totalFirst,
            secondConditionMet: totalSecond,
            thirdConditionMet: totalThird,
            fourthConditionMet: totalFourth
        }), {
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
