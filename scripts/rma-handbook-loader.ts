import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';


type RMALink = {
    "name": string,
    "link": string
}

async function getPdfLinks(url: string): Promise<RMALink[]> {
    const browser: Browser = await puppeteer.launch();
    const page: Page = await browser.newPage();
    await page.goto(url);
    await page.waitForNetworkIdle();

    const dataTable = await page.$('#handbookDataTable');
    const rows = await dataTable?.$$('tbody tr');
    const links = await Promise.all(
        rows?.map(async (row) => {
            const firstCell = await row.$(`td:nth-child(1)`);
            const link = await firstCell?.$('a');
            return link ? { name: await link.evaluate((node) => node.textContent?.trim()), href: "https://www.rma.usda.gov" + await link.evaluate((node) => node.getAttribute('href')) } : null;
        }) ?? [],
    );

    const nextButton = await page.$('#handbookDataTable_next');
    let isDisabled = await nextButton!.evaluate(button => button.classList.contains('disabled'));
    while (!isDisabled) {
        const nextButton = await page.$('#handbookDataTable_next');
        isDisabled = await nextButton!.evaluate(button => button.classList.contains('disabled'));
        if (!isDisabled) {
            await nextButton?.click();
            await page.waitForNetworkIdle();
            const nextRows = await dataTable?.$$('tbody tr');
            const nextLinks = await Promise.all(
                nextRows?.map(async (row) => {
                    const firstCell = await row.$(`td:nth-child(1)`);
                    const link = await firstCell?.$('a');
                    return link ? {
                        name: await link.evaluate((node) => node.textContent?.trim()), href: "https://www.rma.usda.gov" + await link.evaluate((node) => node.getAttribute('href'))
                    } : null;
                }) ?? [],
            );
            links.push(...nextLinks);
        }
    }

    // const regex = /media\/RMA\/Handbooks/;
    // const regex2 = /ftp\/Publications\/M13_Handbook/;

    // const pdfLinks = allLinks.filter((item) => item.link.match(regex));
    const pdfLinks: RMALink[] = links.map((item) => {
        let x: RMALink = {
            name: item?.name || "",
            link: item?.href || ""
        }
        return x;
    })

    await browser.close();

    return pdfLinks;
}

export const getRMAHandbooks = async (): Promise<RMALink[]> => {
    const urls: string[] = [
        'https://www.rma.usda.gov/Policy-and-Procedure/Program-Administration---14000',
        'https://www.rma.usda.gov/Policy-and-Procedure/Coverage-Plans---18000',
        'https://www.rma.usda.gov/Policy-and-Procedure/Privately-Developed-Products---20000',
        'https://www.rma.usda.gov/Policy-and-Procedure/Program-Evaluations---22000',
        'https://www.rma.usda.gov/Policy-and-Procedure/Underwriting---24000',
        'https://www.rma.usda.gov/Policy-and-Procedure/Loss-Adjustment-Standards---25000',
    ];

    let links: RMALink[] = [];

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

    return links;
};

async function testPage() {
    const browser: Browser = await puppeteer.launch();
    const page: Page = await browser.newPage();
    await page.goto('https://www.rma.usda.gov/Policy-and-Procedure/Underwriting---24000');

    await page.waitForNetworkIdle();

    const dataTable = await page.$('#handbookDataTable');
    const rows = await dataTable?.$$('tbody tr');
    const links = await Promise.all(
        rows?.map(async (row) => {
            const firstCell = await row.$(`td:nth-child(1)`);
            const link = await firstCell?.$('a');
            return link ? { name: await link.evaluate((node) => node.textContent?.trim()), href: await link.evaluate((node) => node.getAttribute('href')) } : null;
        }) ?? [],
    );

    const nextButton = await page.$('#handbookDataTable_next');
    let isDisabled = await nextButton!.evaluate(button => button.classList.contains('disabled'));
    while (!isDisabled) {
        const nextButton = await page.$('#handbookDataTable_next');
        isDisabled = await nextButton!.evaluate(button => button.classList.contains('disabled'));
        if (!isDisabled) {
            await nextButton?.click();
            await page.waitForNetworkIdle();
            const nextRows = await dataTable?.$$('tbody tr');
            const nextLinks = await Promise.all(
                nextRows?.map(async (row) => {
                    const firstCell = await row.$(`td:nth-child(1)`);
                    const link = await firstCell?.$('a');
                    return link ? {
                        name: await link.evaluate((node) => node.textContent?.trim()), href: "https://www.rma.usda.gov" + await link.evaluate((node) => node.getAttribute('href'))
                    } : null;
                }) ?? [],
            );
            links.push(...nextLinks);
        }
    }

    console.log(links.filter((link) => link !== null));

    await browser.close();
}

(async () => {
    const results = await getRMAHandbooks();
    fs.writeFileSync("docs/links.json", JSON.stringify(results))
    console.log(`Found ${results.length} files`);
    // await testPage();
    console.log('ingestion complete');
})();
