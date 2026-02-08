/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs' {
  const XLSX: any;
  export default XLSX;
}
