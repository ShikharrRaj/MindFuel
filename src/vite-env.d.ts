/// <reference types="vite/client" />

/** Short commit SHA of this build (Vercel), or "dev". Set in vite.config.ts. */
declare const __RELEASE__: string

interface ImportMetaEnv {
  /** Contact for privacy requests, shown on the legal pages. */
  readonly VITE_CONTACT_EMAIL?: string
  /** Person or organisation that runs this deployment. */
  readonly VITE_OPERATOR_NAME?: string
}
