import { mkdir, writeFile } from "node:fs/promises";
import { generateOpenApiDocument } from "../dist/openapi.js";

const outputDirectory = new URL("../openapi/", import.meta.url);
const outputFile = new URL(
  "simple-cloud-reader-v1.json",
  outputDirectory,
);

await mkdir(outputDirectory, { recursive: true });
await writeFile(
  outputFile,
  `${JSON.stringify(generateOpenApiDocument(), null, 2)}\n`,
  "utf8",
);
