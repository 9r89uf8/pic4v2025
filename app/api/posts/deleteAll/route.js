// app/api/posts/route.js
import { adminDb } from '@/app/utils/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const getMonths = () => {
    const currentDate = new Date();
    const currentMonthIndex = currentDate.getMonth(); // 0-11 (January is 0, December is 11)

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


export async function DELETE() {
    try {

        const [prevMonth, currentMonth] = getMonths();
        // Get all documents in the 'firstPicks' collection where 'drawMonth' is 'Jul'
        const picturesSnapshot = await adminDb.firestore().collection('draws').where("drawMonth", "==", 'Jan').get();

        // Create a batch to perform multiple operations
        const batch = adminDb.firestore().batch();

        // Iterate over each document and add a delete operation to the batch
        picturesSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });


        // Commit the batch
        await batch.commit();
        let response = 'deleted all for current month'

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, max-age=0'
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
