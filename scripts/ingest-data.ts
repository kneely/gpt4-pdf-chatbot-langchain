import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { pinecone } from '@/utils/pinecone-client';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import {
  PuppeteerEvaluate,
  PuppeteerWebBaseLoader,
} from 'langchain/document_loaders';
import { getRMAHandbooks } from './rma-handbook-loader';
import { Document } from 'langchain/document';
import { Browser, Page, Puppeteer } from 'puppeteer';
import { PuppeteerWebBaseLoaderOptions } from 'langchain/dist/document_loaders/web/puppeteer';

/* Name of directory to retrieve your files from 
   Make sure to add your PDF files inside the 'docs' folder
*/
const filePath = 'docs';

/*load raw docs from the all files in the directory */
// const directoryLoader = new DirectoryLoader(filePath, {
//       '.pdf': (path) => new PDFLoader(path),
// });

// const rawDocs = await directoryLoader.load();

// const webOptions: PuppeteerWebBaseLoaderOptions = {
//   evaluate: 'page'
// }

export const run = async () => {
  try {
    let rawDocs: Document<Record<string, any>>[] = [];
    const urls = await getRMAHandbooks();

    await Promise.any(
      urls.map(async (item) => {
        const webLoader = new PuppeteerWebBaseLoader(item, {
          launchOptions: {
            headless: true,
          },
          gotoOptions: {
            waitUntil: 'domcontentloaded',
          },
          /** Pass custom evaluate, in this case you get page and browser instances */
          async evaluate(page: Page, browser: Browser) {
            const result = await page.evaluate(() => {
              return new PDFLoader(page.);
            });
            return result;
          },
        });
        let res = await webLoader.load();
        console.log(res);
        rawDocs.push(...res);
      }),
    );

    /* Split text into chunks */
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.splitDocuments(rawDocs);
    console.log('split docs', docs);

    console.log('creating vector store...');
    /*create and store the embeddings in the vectorStore*/
    const embeddings = new OpenAIEmbeddings();
    const index = pinecone.Index(PINECONE_INDEX_NAME); //change to your own index name

    //embed the PDF documents
    await PineconeStore.fromDocuments(docs, embeddings, {
      pineconeIndex: index,
      namespace: PINECONE_NAME_SPACE,
      textKey: 'text',
    });
  } catch (error) {
    console.log('error', error);
    throw new Error('Failed to ingest your data');
  }
};

(async () => {
  await run();
  console.log('ingestion complete');
})();
