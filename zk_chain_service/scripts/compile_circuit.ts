import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const rootDir = path.resolve(__dirname, "..");
const binDir = path.join(rootDir, "bin");
const circomBin = process.platform === "win32"
  ? path.join(binDir, "circom.exe")
  : "circom";

const buildDir = path.join(rootDir, "build");
const circuitsDir = path.join(rootDir, "circuits");
const circuitFile = path.join(circuitsDir, "causal_verdict.circom");

if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

console.log("=== [1/2] Compiling Circom Circuit ===");
console.log(`Circuit: ${circuitFile}`);
console.log(`Compiler: ${circomBin}`);

const compileCmd = `"${circomBin}" "${circuitFile}" --r1cs --wasm --sym -o "${buildDir}" -l "${path.join(rootDir, "node_modules")}"`;
console.log(`Executing: ${compileCmd}`);
execSync(compileCmd, { stdio: "inherit" });
console.log("Circuit compilation completed successfully.");
