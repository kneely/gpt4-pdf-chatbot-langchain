import { link } from 'fs';
import puppeteer, { Browser, Page } from 'puppeteer';

async function getPdfLinks(url: string): Promise<string[]> {
    const browser: Browser = await puppeteer.launch();
    const page: Page = await browser.newPage();
    await page.goto(url);

    // Extract PDF links
    const allLinks = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href$=".ashx"]')).map(
            (link) => (link as HTMLAnchorElement).href,
        ),
    );

    const regex = /media\/RMA\/Handbooks/;

    const pdfLinks = allLinks.filter((item) => item.match(regex));

    await browser.close();

    return pdfLinks;
}

async function getPdfBlob(url: string) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay

    let response;
    try {
        // Navigating to the page and treating the response as ArrayBuffer
        response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 }); // timeout after 120 seconds
    } catch (error: Error | any) {
        console.error(`Error navigating to URL: ${url}`);
        console.error(`Error message: ${error.message}`);
        await browser.close();
        return null;
    }

    if (!response) {
        console.error('No response from the server.');
        await browser.close();
        return null;
    }

    // Get the pdf as a Buffer
    const pdfBuffer = await response.buffer();

    await browser.close();

    // Use the buffer as needed
    // Here we're just returning it
    return pdfBuffer;
}

export const getRMAHandbooks = async (): Promise<string[]> => {
    const urls: string[] = [
        'https://www.rma.usda.gov/Policy-and-Procedure/Program-Administration---14000',
        'https://www.rma.usda.gov/Policy-and-Procedure/Coverage-Plans---18000',
        'https://www.rma.usda.gov/Policy-and-Procedure/Privately-Developed-Products---20000',
        'https://www.rma.usda.gov/Policy-and-Procedure/Program-Evaluations---22000',
        'https://www.rma.usda.gov/Policy-and-Procedure/Underwriting---24000',
        'https://www.rma.usda.gov/Policy-and-Procedure/Loss-Adjustment-Standards---25000',
    ];

    let links: string[] = [];
    let buffers: Buffer[] = [];

    for (const url of urls) {
        try {
            const res = await getPdfLinks(url);
            links.push(...res);
        } catch (error) {
            console.error(`Failed to get PDF links for URL: ${url}`);
            console.error(`Error: ${error}`);
        }

        // Add a delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }

    for (const url of links) {
        try {
            const res = await getPdfBlob(url);
            if (res) {
                buffers.push(res);
            }
        } catch (error) {
            console.error(`Failed to get PDF blob for URL: ${url}`);
            console.error(`Error: ${error}`);
        }

        // Add a delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }

    return links;
};


(async () => {
    const results = await getRMAHandbooks();
    console.log(results);
    console.log('ingestion complete');
})();
