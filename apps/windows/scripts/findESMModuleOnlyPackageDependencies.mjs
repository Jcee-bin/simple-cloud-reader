import fs from "fs";
import path from "path";

async function processDir(folderPath) {
    const fileNames = await fs.promises.readdir(folderPath);
    for (const fileName of fileNames) {
        const filePath = path.join(folderPath, fileName);
        const stat = await fs.promises.stat(filePath);
        const isFile = stat.isFile();
        if (isFile && fileName === "package.json") {
            const jsonStr = await fs.promises.readFile(filePath, {
                encoding: "utf8",
            });
            const json = JSON.parse(jsonStr);
            if (json.type === "module" && !json.main) {
                let hasCJSExport = false;
                if (json.exports) {
                    const keys = Object.keys(json.exports);
                    for (const key of keys) {
                        if (key === "node") {
                            hasCJSExport = true;
                            break;
                        }
                        if (!!json.exports[key] && typeof json.exports[key] === "object") {
                            const subkeys = Object.keys(json.exports[key]);
                            for (const subkey of subkeys) {
                                if (subkey === "require" || subkey === "node") {
                                    hasCJSExport = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                if (!hasCJSExport) {
                    console.log(filePath);
                    console.log("type", json.type);
                    console.log("main", json.main);
                    console.log("module", json.module);
                    console.log("browser", json.browser);
                    console.log("exports", JSON.stringify(json.exports, null, 4));
                }
            }
        } else if (stat.isDirectory()) {
            await processDir(filePath)
        }
    }
}

let errored = false;
try {
    await processDir(path.join(process.cwd(), "node_modules"));
} catch (err) {
    console.error("ERROR!");
    console.error(err);
    errored = true;
}
if (errored) {
    console.error(">>>>>>>>>>>>>> NOK :(");
    process.exit(1);
} else {
    console.log(">>>>>>>>>>>>>> OK :)");
    process.exit(0);
}
