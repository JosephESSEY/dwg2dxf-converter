# dwg2dxf-converter

![NPM Version](https://img.shields.io/npm/v/dwg2dxf-converter)
![License](https://img.shields.io/npm/l/dwg2dxf-converter)
![Node Version](https://img.shields.io/node/v/dwg2dxf-converter)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

## Description

`dwg2dxf-converter` is a professional Node.js package designed to convert CAD files from `.dwg` format to `.dxf` format (compatible with AutoCAD 2000/2004 and higher).

Built for rigorous production environments, this package is **100% standalone**. It requires no external system dependencies (no need to install LibreDWG, Python, or C++ compilers on the target server). The GNU LibreDWG conversion engine is pre-compiled to **WebAssembly (Wasm)**, making it universally compatible (Windows, macOS, Linux) and blazing fast.

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

For complete handling in an asynchronous environment (e.g., a backend API):

```javascript
const { convertDwgToDxf, checkWasm } = require('dwg2dxf-converter');

async function processFile(inputPath, outputPath) {
    // 1. Check engine availability
    const isReady = await checkWasm();
    if (!isReady) throw new Error("Conversion engine is unavailable.");

    // 2. Start conversion with a timeout (e.g., 15 seconds)
    const result = await convertDwgToDxf(inputPath, outputPath, { timeout: 15000 });

    if (!result.success) {
        console.error(`Conversion failed: ${result.error}`);
        return;
    }

    console.log(`✅ DXF successfully generated in ${result.duration}ms`);
    console.log(`📁 Output file size: ${(result.fileSize / 1024).toFixed(2)} KB`);
}

processFile('./data/input_R14.dwg', './data/output_2000.dxf');
```

## API Reference

### `convertDwgToDxf(inputPath, outputPath, [options])`

Main asynchronous conversion function.

- `inputPath` *(string)*: Absolute or relative path to the input `.dwg` file.
- `outputPath` *(string)*: Destination path for the generated `.dxf` file.
- `options` *(Object)*:
  - `timeout` *(number)*: Maximum time allowed for the conversion in milliseconds. Default: `30000` (30s).

**Returns a `Promise<Object>`:**
```javascript
{
  success: boolean,       // true if conversion succeeded
  outputPath: string,     // The path to the generated file (or null if an error occurred)
  duration: number,       // Execution time in ms
  fileSize: number,       // Size of the generated DXF in bytes
  error: string | null    // Detailed error message (if success === false)
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

MIT © JosephESSEY
The embedded LibreDWG engine is licensed under GPLv3.
