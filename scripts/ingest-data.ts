import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { DirectoryLoader, UnknownHandling } from 'langchain/document_loaders/fs/directory';
import { CustomPDFLoader } from '@/utils/customPDFLoader';
import { UnstructuredDirectoryLoader } from "langchain/document_loaders/fs/unstructured";
import { CheerioWebBaseLoader, PDFLoader, UnstructuredLoader } from 'langchain/document_loaders';
import axios from 'axios';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';
import { pinecone } from '@/utils/pinecone-client';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';

/* Name of directory to retrieve your files from 
   Make sure to add your PDF files inside the 'docs' folder
*/
const localPath = 'docs/queue';
const pdfUrl = 'https://www.rma.usda.gov/-/media/RMA/Handbooks/Privately-Developed-Products---20000/Florida-Citrus-Fruit/2023-20650L-1H-APH-Florida-Citrus-Fruit-Loss-Adjustment-Standards-Handbook.ashx';

export const run = async () => {
  try {
    /*load raw docs from the all files in the directory */
    const directoryLoader = new DirectoryLoader(localPath, {
      '.pdf': (path) => new CustomPDFLoader(path),
    });

    const loader = new UnstructuredDirectoryLoader(localPath, {
      apiKey: "test",
      apiUrl: "http://localhost:8000/general/v0/general",
      recursive: true,
      unknown: UnknownHandling.Ignore,

    })

    const rawDocs = await loader.load();

    console.log(rawDocs);

    /* Split text into chunks */
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 4000,
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
