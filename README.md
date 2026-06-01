# dwg2dxf-converter

<p align="center">
  <img src="logo/dwg2dxf_converter_logo.svg" alt="dwg2dxf-converter logo" width="180" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dwg2dxf-converter">
    <img src="https://img.shields.io/npm/v/dwg2dxf-converter" alt="NPM Version" />
  </a>
  <a href="https://www.npmjs.com/package/dwg2dxf-converter">
    <img src="https://img.shields.io/npm/dm/dwg2dxf-converter" alt="NPM Downloads" />
  </a>
  <a href="https://img.shields.io/npm/l/dwg2dxf-converter">
    <img src="https://img.shields.io/npm/l/dwg2dxf-converter" alt="License" />
  </a>
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/node/v/dwg2dxf-converter" alt="Node Version" />
  </a>
</p>

## Description

`dwg2dxf-converter` is a highly optimized, professional **libredwg nodejs wrapper** designed to easily **convert dwg file nodejs** applications need to process. It allows you to **convert dwg to dxf node** or **convert dwg to dxf nodejs** formats (compatible with AutoCAD 2000/2004/2018 and higher).

If you are looking for an **open source dwg converter** or a **dwg converter without autocad** to convert **dwg to dxf node** without any heavy native software or cloud APIs on your server, this package is the ultimate production-grade solution.

Built for rigorous production environments, this package is **100% standalone and offline**. It requires no external system dependencies (no need to install LibreDWG, Python, or C++ compilers on the target server). The GNU LibreDWG conversion engine (v0.13.4) is pre-compiled to **WebAssembly (Wasm)**, making it universally compatible (Windows, macOS, Linux) and blazing fast.

## Why dwg2dxf-converter?

| Feature | dwg2dxf-converter | Other solutions |
|---|---|---|
| Zero system dependencies | ✅ | ❌ Requires LibreDWG install |
| Works on Windows/Mac/Linux | ✅ | ⚠️ Often Linux only |
| Powered by WebAssembly | ✅ | ❌ |
| All DWG versions (R12→2018+) | ✅ | ⚠️ Partial |
| Open-source (MIT) | ✅ | ⚠️ Often GPL only |
| TypeScript support | ✅ | ❌ |

## Installation

Simply install via npm (no native configuration required):

```bash
npm install dwg2dxf-converter
```

## Quick Start

Here is a minimal example to convert a file in 5 lines of code:

```javascript
const { convertDwgToDxf } = require('dwg2dxf-converter');

(async () => {
    const result = await convertDwgToDxf('./plan.dwg', './plan.dxf');
    console.log(result.success ? "Conversion successful!" : "Error:", result.error);
})();
```

### TypeScript / ES Modules

This package includes native, first-class TypeScript typings (`index.d.ts`). You can import and use it in TS / ES Modules directly:

```typescript
import { convertDwgToDxf, ConversionResult } from 'dwg2dxf-converter';

async function main() {
    const result: ConversionResult = await convertDwgToDxf('./plan.dwg', './plan.dxf');
    if (result.success) {
        console.log(`DXF generated successfully. Size: ${result.fileSize} bytes.`);
    } else {
        console.error(`Conversion failed: ${result.error}`);
    }
}
```

## Advanced Usage

### Asynchronous Error and Warning Handling

For complete handling in an asynchronous environment (e.g., a backend API), you can inspect warnings for non-critical elements while still generating a valid DXF file:

```javascript
const { convertDwgToDxf, checkWasm } = require('dwg2dxf-converter');

async function processFile(inputPath, outputPath) {
    // 1. Check engine availability
    const isReady = await checkWasm();
    if (!isReady) throw new Error("Conversion engine is unavailable.");

    // 2. Start conversion with a timeout (e.g., 15 seconds)
    const result = await convertDwgToDxf(inputPath, outputPath, { timeout: 15000 });

    if (!result.success) {
        console.error(`❌ Conversion failed: ${result.error}`);
        return;
    }

    console.log(`✅ DXF successfully generated in ${result.duration}ms`);
    console.log(`📁 Output file size: ${(result.fileSize / 1024).toFixed(2)} KB`);

    // 3. Inspect warnings (non-critical issues)
    if (result.warnings) {
        console.warn(`⚠️ Conversion completed with warnings:`);
        result.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
}

processFile('./data/input_constraints.dwg', './data/output.dxf');
```

### Batch Conversion (Multiple Files)

You can convert multiple files at once by passing an array of paths. The batch processor will run the conversions sequentially to keep execution safe, prevent WebAssembly memory spikes, and avoid concurrent file locking.

```javascript
const { convertDwgToDxf } = require('dwg2dxf-converter');

async function batchConvert() {
    const inputFiles = ['./plan1.dwg', './plan2.dwg', './plan3.dwg'];
    const outputDir = './output_dxf/';

    console.log("Starting batch conversion...");
    const results = await convertDwgToDxf(inputFiles, outputDir);

    results.forEach((result, index) => {
        if (result.success) {
            console.log(`[${index + 1}] Success: ${result.outputPath}`);
        } else {
            console.error(`[${index + 1}] Failed converting ${inputFiles[index]}: ${result.error}`);
        }
    });
}

batchConvert();
```

## CLI Usage

`dwg2dxf-converter` comes with an integrated, zero-dependency command line interface utilizing beautiful, color-coded logging.

### Standard Conversion (Single File)
```bash
npx dwg2dxf-converter input.dwg output.dxf
```

### Batch Conversion (Directory Output)
Convert multiple DWG files into a target directory using the `--batch` or `-b` flag:
```bash
npx dwg2dxf-converter --batch plan1.dwg plan2.dwg -o ./output/
```

### CLI Options
- `-h, --help` : Show help instructions.
- `-v, --version` : Show package version and pre-compiled LibreDWG version.
- `-b, --batch` : Convert multiple files. The last argument (or `-o` path) will be used as the output folder.
- `-o, --output` : Explicitly set the output folder or file path.
- `--timeout <ms>` : Conversion timeout limit in milliseconds per file (default: 30000).

## API Reference

### `convertDwgToDxf(inputPath, outputPath, [options])`

Main asynchronous conversion function.

- `inputPath` *(string | string[])*: Absolute or relative path to the input `.dwg` file (or array of paths for batch conversion).
- `outputPath` *(string)*: Destination path for the generated `.dxf` file (or output directory path for batch conversion).
- `options` *(Object)*:
  - `timeout` *(number)*: Maximum time allowed for the conversion in milliseconds per file. Default: `30000` (30s).

**Returns a `Promise<Object>` (or `Promise<Object[]>` in batch mode):**
```javascript
{
  success: boolean,          // true if conversion succeeded (including with warnings)
  outputPath: string | null, // Path to the generated file, or null if failed
  duration: number,          // Execution time in ms
  fileSize: number,          // Size of the generated DXF in bytes (0 if failed)
  error: string | null,      // Detailed critical error message (null if success === true)
  warnings: string[] | null  // Array of non-critical warning messages (null if no warnings)
}
```

### `checkWasm()`

- **Returns:** `Promise<boolean>`
Loads the WebAssembly module into memory. Returns `true` if the engine is ready, `false` otherwise.

## Supported DWG Versions

The underlying LibreDWG engine can read a vast range of historical DWG versions:

| AutoCAD Version | Internal Version | Read Support |
|-----------------|------------------|--------------|
| AutoCAD Release 12 | R12 (AC1009) | ✅ Yes |
| AutoCAD Release 13 | R13 (AC1012) | ✅ Yes |
| AutoCAD Release 14 | R14 (AC1014) | ✅ Yes |
| AutoCAD 2000    | 2000 (AC1015)    | ✅ Yes |
| AutoCAD 2004    | 2004 (AC1018)    | ✅ Yes |
| AutoCAD 2007    | 2007 (AC1021)    | ✅ Yes |
| AutoCAD 2010    | 2010 (AC1024)    | ✅ Yes |
| AutoCAD 2013    | 2013 (AC1027)    | ✅ Yes |
| AutoCAD 2018+   | 2018 (AC1032)    | ✅ Yes |

## Contributing

To re-compile the Wasm module from the LibreDWG C sources:

1. Make sure you have **Emscripten** (`emcc` / `emsdk`) and **CMake** installed and added to your `PATH`.
2. **On Linux / macOS (Bash):** Run the build script:
   ```bash
   chmod +x ./scripts/build-wasm.sh
   ./scripts/build-wasm.sh
   ```
3. **On Windows (PowerShell):** Make sure to run `emsdk_env.ps1` in your session first, then execute:
   ```powershell
   .\scripts\build-wasm.ps1
   ```
   *(No MSYS2 or WSL is required, as the build compiles natively using CMake and MinGW).*

## License

This package features a dual-licensed architecture:

1. **Javascript Wrapper & API (`index.js`, `lib/`, `bin/`):** 100% licensed under the permissive **MIT License** © JosephESSEY. You can freely integrate, modify, and distribute the Node.js wrapper inside commercial projects without any restriction.
2. **Embedded WebAssembly Engine (`wasm/libredwg.wasm`):** Pre-compiled binary from the official [GNU LibreDWG](https://www.gnu.org/software/libredwg/) (v0.13.4) source code, licensed under the **GPLv3 License**. 

> [!NOTE]
> **Enterprise Legal Compliance:**
> Because the GPLv3-licensed LibreDWG engine is compiled to an independent WebAssembly binary and runs in an isolated virtual filesystem environment inside Node.js (interacting with your application only via standard file inputs/outputs over the WASM boundary), it is treated as an independent subprocess/binary component. 
> Therefore, using this package in your Node.js application **does NOT infect or require your own application code to be open-sourced under GPLv3**. Your application code remains 100% proprietary under the MIT or your own custom commercial license.

