import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
loadEnvConfig(root);

const config: NextConfig = {
  transpilePackages: ["@tailor/core", "@tailor/react"],
  turbopack: { root },
};

export default config;
