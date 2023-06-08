enum LoaderType {
  'DIRECTORY' = 'Directory',
  'WEB' = 'Web',
}

const LOADER_TYPE: LoaderType = process.env.PINECONE_INDEX_NAME as LoaderType ?? LoaderType.DIRECTORY

let PDF_LOCATIONS;

if (LOADER_TYPE == LoaderType.DIRECTORY) {
    PDF_LOCATIONS = process.env.PDF_LOCATIONS ?? 'docs'
} else if (LOADER_TYPE == LoaderType.WEB) {
    if (!process.env.PDF_LOCATIONS) {
        throw new Error("You must provide PDF Locations");
    }
}