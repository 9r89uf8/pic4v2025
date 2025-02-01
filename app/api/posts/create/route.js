import { adminDb } from '@/app/utils/firebaseAdmin';
import puppeteer from 'puppeteer-core';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BROWSER_WS = process.env.PROXY;

export async function GET(req) {
    try {
        let firstPicks = [];
        let previousPicks = Array(8).fill().map(() => [null, null, null]);

        console.log('Connecting to Scraping Browser...');
        const browser = await puppeteer.connect({
            browserWSEndpoint: BROWSER_WS,
        });
        const page = await browser.newPage();

        const checkResults = async () => {
            await page.goto('https://www.illinoislottery.com/dbg/results/pick3?page=1', {
                waitUntil: 'networkidle0'
            });

            await page.waitForFunction(() => {
                const elements = document.querySelectorAll('.results__list-item');
                return elements.length > 0;
            });

            const divsWithClassDfs = await page.evaluate(() => Array.from(document.querySelectorAll('.results__list-item')).slice(0, 9).map(elem => ({
                dateInfo: elem.querySelector('.dbg-results__date-info').textContent,
                drawInfo: elem.querySelector('.dbg-results__draw-info').textContent,
                pick: Array.from(elem.querySelectorAll(".grid-ball--pick3-primary")).map(e => parseInt(e.textContent.replace(/[^0-9]/g, ""))),
                fireball: elem.querySelector('.grid-ball--pick3-secondary--selected')?.textContent.trim() || null,
            })));

            // Create an array of 9 draws, filling missing data with null values
            const allDraws = Array(9).fill(null).map((_, index) => {
                if (index < divsWithClassDfs.length) {
                    const draw = divsWithClassDfs[index];
                    const { dateInfo, drawInfo, pick, fireball } = draw;
                    let [firstNumber = null, secondNumber = null, thirdNumber = null] = pick;

                    let r = parseInt(dateInfo.match(/\d+/)?.[0]) || 0;
                    let y = drawInfo.replace(/[^a-zA-Z]+/g, "");
                    if(y === 'midday'){
                        r = r * 2;
                    } else {
                        r = (r * 2) + 1;
                    }

                    // Create sorted version
                    let sortedNumbers = [...pick];
                    if (firstNumber !== null && secondNumber !== null && thirdNumber !== null) {
                        sortedNumbers.sort((a, b) => a - b);
                    }
                    let [sortedFirst, sortedSecond, sortedThird] = sortedNumbers;

                    return {
                        // Original numbers
                        originalFirstNumber: firstNumber,
                        originalSecondNumber: secondNumber,
                        originalThirdNumber: thirdNumber,
                        // Sorted numbers
                        sortedFirstNumber: sortedFirst,
                        sortedSecondNumber: sortedSecond,
                        sortedThirdNumber: sortedThird,
                        fireball: fireball ? parseInt(fireball) : null,
                        dateInfo,
                        drawInfo,
                        r
                    };
                } else {
                    return {
                        originalFirstNumber: null,
                        originalSecondNumber: null,
                        originalThirdNumber: null,
                        sortedFirstNumber: null,
                        sortedSecondNumber: null,
                        sortedThirdNumber: null,
                        fireball: null,
                        dateInfo: null,
                        drawInfo: null,
                        r: null
                    };
                }
            });

            // Get current draw (first in the list)
            const currentDraw = allDraws[0];

            // Calculate sums for both original and sorted
            const originalDrawSum = currentDraw.originalFirstNumber !== null &&
            currentDraw.originalSecondNumber !== null &&
            currentDraw.originalThirdNumber !== null
                ? currentDraw.originalFirstNumber + currentDraw.originalSecondNumber + currentDraw.originalThirdNumber
                : null;

            const sortedDrawSum = currentDraw.sortedFirstNumber !== null &&
            currentDraw.sortedSecondNumber !== null &&
            currentDraw.sortedThirdNumber !== null
                ? currentDraw.sortedFirstNumber + currentDraw.sortedSecondNumber + currentDraw.sortedThirdNumber
                : null;

            const completeCurrentDraw = {
                // Original order data
                originalFirstNumber: currentDraw.originalFirstNumber,
                originalSecondNumber: currentDraw.originalSecondNumber,
                originalThirdNumber: currentDraw.originalThirdNumber,
                originalDraw: currentDraw.originalFirstNumber !== null
                    ? `${currentDraw.originalFirstNumber}${currentDraw.originalSecondNumber}${currentDraw.originalThirdNumber}`
                    : null,
                originalDrawSum,
                originalFirstAndSecond: currentDraw.originalFirstNumber !== null
                    ? `${currentDraw.originalFirstNumber}${currentDraw.originalSecondNumber}`
                    : null,
                originalSecondAndThird: currentDraw.originalSecondNumber !== null
                    ? `${currentDraw.originalSecondNumber}${currentDraw.originalThirdNumber}`
                    : null,
                originalFirstAndThird: currentDraw.originalFirstNumber !== null
                    ? `${currentDraw.originalFirstNumber}${currentDraw.originalThirdNumber}`
                    : null,

                // Sorted order data
                sortedFirstNumber: currentDraw.sortedFirstNumber,
                sortedSecondNumber: currentDraw.sortedSecondNumber,
                sortedThirdNumber: currentDraw.sortedThirdNumber,
                sortedDraw: currentDraw.sortedFirstNumber !== null
                    ? `${currentDraw.sortedFirstNumber}${currentDraw.sortedSecondNumber}${currentDraw.sortedThirdNumber}`
                    : null,
                sortedDrawSum,
                sortedFirstAndSecond: currentDraw.sortedFirstNumber !== null
                    ? `${currentDraw.sortedFirstNumber}${currentDraw.sortedSecondNumber}`
                    : null,
                sortedSecondAndThird: currentDraw.sortedSecondNumber !== null
                    ? `${currentDraw.sortedSecondNumber}${currentDraw.sortedThirdNumber}`
                    : null,
                sortedFirstAndThird: currentDraw.sortedFirstNumber !== null
                    ? `${currentDraw.sortedFirstNumber}${currentDraw.sortedThirdNumber}`
                    : null,

                // Previous numbers (original order)
                originalPreviousFirst1: allDraws[1]?.originalFirstNumber ?? null,
                originalPreviousFirst2: allDraws[2]?.originalFirstNumber ?? null,
                originalPreviousFirst3: allDraws[3]?.originalFirstNumber ?? null,
                originalPreviousFirst4: allDraws[4]?.originalFirstNumber ?? null,
                originalPreviousFirst5: allDraws[5]?.originalFirstNumber ?? null,
                originalPreviousFirst6: allDraws[6]?.originalFirstNumber ?? null,
                originalPreviousFirst7: allDraws[7]?.originalFirstNumber ?? null,
                originalPreviousFirst8: allDraws[8]?.originalFirstNumber ?? null,

                originalPreviousSecond1: allDraws[1]?.originalSecondNumber ?? null,
                originalPreviousSecond2: allDraws[2]?.originalSecondNumber ?? null,
                originalPreviousSecond3: allDraws[3]?.originalSecondNumber ?? null,
                originalPreviousSecond4: allDraws[4]?.originalSecondNumber ?? null,
                originalPreviousSecond5: allDraws[5]?.originalSecondNumber ?? null,
                originalPreviousSecond6: allDraws[6]?.originalSecondNumber ?? null,
                originalPreviousSecond7: allDraws[7]?.originalSecondNumber ?? null,
                originalPreviousSecond8: allDraws[8]?.originalSecondNumber ?? null,

                originalPreviousThird1: allDraws[1]?.originalThirdNumber ?? null,
                originalPreviousThird2: allDraws[2]?.originalThirdNumber ?? null,
                originalPreviousThird3: allDraws[3]?.originalThirdNumber ?? null,
                originalPreviousThird4: allDraws[4]?.originalThirdNumber ?? null,
                originalPreviousThird5: allDraws[5]?.originalThirdNumber ?? null,
                originalPreviousThird6: allDraws[6]?.originalThirdNumber ?? null,
                originalPreviousThird7: allDraws[7]?.originalThirdNumber ?? null,
                originalPreviousThird8: allDraws[8]?.originalThirdNumber ?? null,

                // Previous numbers (sorted order)
                sortedPreviousFirst1: allDraws[1]?.sortedFirstNumber ?? null,
                sortedPreviousFirst2: allDraws[2]?.sortedFirstNumber ?? null,
                sortedPreviousFirst3: allDraws[3]?.sortedFirstNumber ?? null,
                sortedPreviousFirst4: allDraws[4]?.sortedFirstNumber ?? null,
                sortedPreviousFirst5: allDraws[5]?.sortedFirstNumber ?? null,
                sortedPreviousFirst6: allDraws[6]?.sortedFirstNumber ?? null,
                sortedPreviousFirst7: allDraws[7]?.sortedFirstNumber ?? null,
                sortedPreviousFirst8: allDraws[8]?.sortedFirstNumber ?? null,

                sortedPreviousSecond1: allDraws[1]?.sortedSecondNumber ?? null,
                sortedPreviousSecond2: allDraws[2]?.sortedSecondNumber ?? null,
                sortedPreviousSecond3: allDraws[3]?.sortedSecondNumber ?? null,
                sortedPreviousSecond4: allDraws[4]?.sortedSecondNumber ?? null,
                sortedPreviousSecond5: allDraws[5]?.sortedSecondNumber ?? null,
                sortedPreviousSecond6: allDraws[6]?.sortedSecondNumber ?? null,
                sortedPreviousSecond7: allDraws[7]?.sortedSecondNumber ?? null,
                sortedPreviousSecond8: allDraws[8]?.sortedSecondNumber ?? null,

                sortedPreviousThird1: allDraws[1]?.sortedThirdNumber ?? null,
                sortedPreviousThird2: allDraws[2]?.sortedThirdNumber ?? null,
                sortedPreviousThird3: allDraws[3]?.sortedThirdNumber ?? null,
                sortedPreviousThird4: allDraws[4]?.sortedThirdNumber ?? null,
                sortedPreviousThird5: allDraws[5]?.sortedThirdNumber ?? null,
                sortedPreviousThird6: allDraws[6]?.sortedThirdNumber ?? null,
                sortedPreviousThird7: allDraws[7]?.sortedThirdNumber ?? null,
                sortedPreviousThird8: allDraws[8]?.sortedThirdNumber ?? null,

                // Common fields
                fireball: currentDraw.fireball,
                drawDate: currentDraw.dateInfo || null,
                drawMonth: currentDraw.dateInfo ? currentDraw.dateInfo.substring(0, 3) : null,
                index: currentDraw.r || null,
                time: currentDraw.drawInfo ? currentDraw.drawInfo.replace(/[^a-zA-Z]+/g, "") : null,
                timestamp: adminDb.firestore.FieldValue.serverTimestamp()
            };

            firstPicks.push(completeCurrentDraw);
        };

        await checkResults();
        await browser.close();

        const draws = adminDb.firestore().collection('draws');

        console.log('Saving response to Firestore...');
        const docRef = await draws.add(firstPicks[0]);
        console.log("Document successfully written with ID: ", docRef.id);

        return new Response(JSON.stringify(firstPicks[0]), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, max-age=0'
            },
        });
    } catch (error) {
        console.error('Error calling Lambda:', error.message);

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



