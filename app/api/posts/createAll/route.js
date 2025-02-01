import { adminDb } from '@/app/utils/firebaseAdmin';
import puppeteer from 'puppeteer-core';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BROWSER_WS = process.env.PROXY;

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

async function scrapePageData(pageNum) {
    console.log(`Processing page ${pageNum}...`);
    const browser = await puppeteer.connect({
        browserWSEndpoint: BROWSER_WS,
    });

    try {
        const page = await browser.newPage();
        await page.goto(`https://www.illinoislottery.com/dbg/results/pick4?page=${pageNum}`, {
            waitUntil: 'networkidle0'
        });

        await page.waitForSelector('.results__list-item');

        const divsWithClassDfs = await page.evaluate(() => Array.from(document.querySelectorAll('.results__list-item')).map(elem => {
            try {
                return {
                    dateInfo: elem.querySelector('.dbg-results__date-info')?.textContent || null,
                    drawInfo: elem.querySelector('.dbg-results__draw-info')?.textContent || null,
                    fireball: elem.querySelector('.grid-ball--pick4-secondary--selected')?.textContent.trim() || null,
                    pick: Array.from(elem.querySelectorAll(".grid-ball--pick4-primary")).map(e => {
                        const num = parseInt(e.textContent.replace(/[^0-9]/g, ""));
                        return isNaN(num) ? null : num;
                    }),
                };
            } catch (error) {
                return {
                    dateInfo: null,
                    drawInfo: null,
                    fireball: null,
                    pick: [null, null, null, null]
                };
            }
        }));

        return divsWithClassDfs.reverse();
    } finally {
        await browser.close();
    }
}

async function processPage(pageNum, currentMonth, previousPicks) {
    const pageData = await scrapePageData(pageNum);
    let draws = [];

    for (let i = 0; i < pageData.length; i++) {
        const { dateInfo, drawInfo, pick, fireball } = pageData[i];
        if (dateInfo?.substring(0, 3) === currentMonth) {
            // Original order numbers
            let [originalFirst = null, originalSecond = null, originalThird = null, originalFourth] = pick;

            let r = parseInt(dateInfo?.match(/\d+/)?.[0] || '0')
            let y = drawInfo?.replace(/[^a-zA-Z]+/g, "") || '';
            if(y === 'midday') {
                r = r * 2
            } else {
                r = (r * 2) + 1
            }

            // Create sorted version
            let sortedNumbers = [...pick];
            if (originalFirst !== null && originalSecond !== null && originalThird !== null && originalFourth !== null) {
                sortedNumbers.sort((a, b) => a - b);
            }
            let [sortedFirst, sortedSecond, sortedThird, sortedFourth] = sortedNumbers;

            const parsedFireball = fireball ? parseInt(fireball) : null;

            // Calculate sums
            const sortedDrawSum = (sortedFirst !== null && sortedSecond !== null && sortedThird !== null && originalFourth !== null)
                ? sortedFirst + sortedSecond + sortedThird + sortedFourth
                : null;

            const originalDrawSum = (originalFirst !== null && originalSecond !== null && originalThird !== null && originalFourth !== null)
                ? originalFirst + originalSecond + originalThird + sortedFourth
                : null;

            // Create draw data object
            const drawData = {
                // Original order data
                originalFirstNumber: originalFirst,
                originalSecondNumber: originalSecond,
                originalThirdNumber: originalThird,
                originalFourthNumber: originalFourth,
                originalDraw: (originalFirst !== null && originalSecond !== null && originalThird !== null && originalFourth !== null)
                    ? `${originalFirst}${originalSecond}${originalThird}${originalFourth}`
                    : null,
                originalDrawSum,
                // Previous numbers (original order)
                originalPreviousFirst1: previousPicks.original[0]?.[0] ?? null,
                originalPreviousFirst2: previousPicks.original[1]?.[0] ?? null,
                originalPreviousFirst3: previousPicks.original[2]?.[0] ?? null,
                originalPreviousFirst4: previousPicks.original[3]?.[0] ?? null,
                originalPreviousFirst5: previousPicks.original[4]?.[0] ?? null,
                originalPreviousFirst6: previousPicks.original[5]?.[0] ?? null,
                originalPreviousFirst7: previousPicks.original[6]?.[0] ?? null,
                originalPreviousFirst8: previousPicks.original[7]?.[0] ?? null,

                originalPreviousSecond1: previousPicks.original[0]?.[1] ?? null,
                originalPreviousSecond2: previousPicks.original[1]?.[1] ?? null,
                originalPreviousSecond3: previousPicks.original[2]?.[1] ?? null,
                originalPreviousSecond4: previousPicks.original[3]?.[1] ?? null,
                originalPreviousSecond5: previousPicks.original[4]?.[1] ?? null,
                originalPreviousSecond6: previousPicks.original[5]?.[1] ?? null,
                originalPreviousSecond7: previousPicks.original[6]?.[1] ?? null,
                originalPreviousSecond8: previousPicks.original[7]?.[1] ?? null,

                originalPreviousThird1: previousPicks.original[0]?.[2] ?? null,
                originalPreviousThird2: previousPicks.original[1]?.[2] ?? null,
                originalPreviousThird3: previousPicks.original[2]?.[2] ?? null,
                originalPreviousThird4: previousPicks.original[3]?.[2] ?? null,
                originalPreviousThird5: previousPicks.original[4]?.[2] ?? null,
                originalPreviousThird6: previousPicks.original[5]?.[2] ?? null,
                originalPreviousThird7: previousPicks.original[6]?.[2] ?? null,
                originalPreviousThird8: previousPicks.original[7]?.[2] ?? null,

                // Sorted data
                sortedFirstNumber: sortedFirst,
                sortedSecondNumber: sortedSecond,
                sortedThirdNumber: sortedThird,
                sortedFourthNumber: sortedFourth,
                sortedDraw: (sortedFirst !== null && sortedSecond !== null && sortedThird !== null)
                    ? `${sortedFirst}${sortedSecond}${sortedThird}${sortedFourth}`
                    : null,
                sortedDrawSum,
                // Previous numbers (sorted)
                sortedPreviousFirst1: previousPicks.sorted[0]?.[0] ?? null,
                sortedPreviousFirst2: previousPicks.sorted[1]?.[0] ?? null,
                sortedPreviousFirst3: previousPicks.sorted[2]?.[0] ?? null,
                sortedPreviousFirst4: previousPicks.sorted[3]?.[0] ?? null,
                sortedPreviousFirst5: previousPicks.sorted[4]?.[0] ?? null,
                sortedPreviousFirst6: previousPicks.sorted[5]?.[0] ?? null,
                sortedPreviousFirst7: previousPicks.sorted[6]?.[0] ?? null,
                sortedPreviousFirst8: previousPicks.sorted[7]?.[0] ?? null,

                sortedPreviousSecond1: previousPicks.sorted[0]?.[1] ?? null,
                sortedPreviousSecond2: previousPicks.sorted[1]?.[1] ?? null,
                sortedPreviousSecond3: previousPicks.sorted[2]?.[1] ?? null,
                sortedPreviousSecond4: previousPicks.sorted[3]?.[1] ?? null,
                sortedPreviousSecond5: previousPicks.sorted[4]?.[1] ?? null,
                sortedPreviousSecond6: previousPicks.sorted[5]?.[1] ?? null,
                sortedPreviousSecond7: previousPicks.sorted[6]?.[1] ?? null,
                sortedPreviousSecond8: previousPicks.sorted[7]?.[1] ?? null,

                sortedPreviousThird1: previousPicks.sorted[0]?.[2] ?? null,
                sortedPreviousThird2: previousPicks.sorted[1]?.[2] ?? null,
                sortedPreviousThird3: previousPicks.sorted[2]?.[2] ?? null,
                sortedPreviousThird4: previousPicks.sorted[3]?.[2] ?? null,
                sortedPreviousThird5: previousPicks.sorted[4]?.[2] ?? null,
                sortedPreviousThird6: previousPicks.sorted[5]?.[2] ?? null,
                sortedPreviousThird7: previousPicks.sorted[6]?.[2] ?? null,
                sortedPreviousThird8: previousPicks.sorted[7]?.[2] ?? null,

                sortedPreviousFourth1: previousPicks.sorted[0]?.[3] ?? null,
                sortedPreviousFourth2: previousPicks.sorted[1]?.[3] ?? null,
                sortedPreviousFourth3: previousPicks.sorted[2]?.[3] ?? null,
                sortedPreviousFourth4: previousPicks.sorted[3]?.[3] ?? null,
                sortedPreviousFourth5: previousPicks.sorted[4]?.[3] ?? null,
                sortedPreviousFourth6: previousPicks.sorted[5]?.[3] ?? null,
                sortedPreviousFourth7: previousPicks.sorted[6]?.[3] ?? null,
                sortedPreviousFourth8: previousPicks.sorted[7]?.[3] ?? null,

                // Common fields
                fireball: parsedFireball,
                drawDate: dateInfo || null,
                drawMonth: dateInfo ? dateInfo.substring(0, 3) : null,
                index: r,
                time: drawInfo ? drawInfo.replace(/[^a-zA-Z]+/g, "") : null,
                timestamp: adminDb.firestore.Timestamp.now(),
            };

            draws.push(drawData);

            // Update previous picks
            previousPicks.sorted.unshift([sortedFirst, sortedSecond, sortedThird, sortedFourth]);
            previousPicks.original.unshift([originalFirst, originalSecond, originalThird, originalFourth]);

            // Keep only last 8 picks
            previousPicks.sorted = previousPicks.sorted.slice(0, 8);
            previousPicks.original = previousPicks.original.slice(0, 8);
        }
    }

    return { draws, previousPicks };
}

async function writeBatchToFirestore(draws) {
    if (draws.length === 0) return;

    const infoCollection = adminDb.firestore().collection('draws');
    const batch = adminDb.firestore().batch();

    draws.forEach(draw => {
        const docRef = infoCollection.doc();
        batch.set(docRef, draw);
    });

    await batch.commit();
    console.log(`Batch write succeeded for ${draws.length} draws`);
}

export async function GET(req) {
    try {
        const [prevMonth, currentMonth] = getMonths();
        console.log('Starting sequential scraping');

        let previousPicks = {
            sorted: Array(8).fill([null, null, null]),
            original: Array(8).fill([null, null, null])
        };

        // Process pages sequentially
        for (let pageNum = 9; pageNum >= 1; pageNum--) {
            try {
                console.log(`Starting to process page ${pageNum}`);
                const result = await processPage(pageNum, currentMonth, previousPicks);

                // Write the draws to Firestore
                await writeBatchToFirestore(result.draws);

                // Update previous picks for next iteration
                previousPicks = result.previousPicks;

                // Optional: Add a small delay between pages
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Error processing page ${pageNum}:`, error);
                // Continue with next page even if current page fails
                continue;
            }
        }

        return new Response(JSON.stringify('good'), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, max-age=0'
            },
        });
    } catch (error) {
        console.error('Error:', error.message);

        if (error.code === 'ECONNABORTED') {
            return new Response(JSON.stringify({ error: 'Request timed out' }), {
                status: 504,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}