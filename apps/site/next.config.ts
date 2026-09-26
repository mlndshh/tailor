import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// Next.js already calls loadEnvConfig once internally, scoped to this app's own directory (which has no
// .env). @next/env caches that first call's result module-globally, so a plain loadEnvConfig(root) here
// would silently return the cached (empty) result instead of reading the monorepo root .env. Force a
// reload so AI_GATEWAY_API_KEY actually reaches process.env.
loadEnvConfig(root, process.env.NODE_ENV !== "production", console, true);

const config: NextConfig = {
  transpilePackages: ["@tailor/core", "@tailor/react"],
  turbopack: { root },
};

export default config;
