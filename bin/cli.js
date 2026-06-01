#!/usr/bin/env node

const path = require('path');
const fs = require('fs/promises');
const { convertDwgToDxf, checkWasm, VERSION } = require('../index');

// ANSI escape codes for standard color output
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";

function showHelp() {
    console.log(`
${BOLD}${CYAN}dwg2dxf-converter CLI${RESET} - Standalone DWG to DXF Converter

${BOLD}Usage:${RESET}
  npx dwg2dxf-converter <input.dwg> <output.dxf> [options]
  npx dwg2dxf-converter --batch <input1.dwg> <input2.dwg> ... -o <output_dir> [options]

${BOLD}Options:${RESET}
  -h, --help     Show this help message.
  -v, --version  Show version information (wrapper and engine).
  -b, --batch    Convert multiple DWG files. Last argument must be output directory.
  -o, --output   Output directory (required with --batch) or output path.
  --timeout      Timeout in milliseconds per file. Default: 30000 (30 seconds).

${BOLD}Examples:${RESET}
  npx dwg2dxf-converter plan.dwg plan.dxf
  npx dwg2dxf-converter --batch file1.dwg file2.dwg -o ./output/
`);
}

function showVersion() {
    console.log(`${BOLD}${CYAN}dwg2dxf-converter wrapper:${RESET} v${VERSION}`);
    console.log(`${BOLD}${CYAN}LibreDWG engine:${RESET} v0.13.4 (WebAssembly Standalone)`);
}

async function run() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
        showHelp();
        process.exit(0);
    }

    if (args.includes('-v') || args.includes('--version')) {
        showVersion();
        process.exit(0);
    }

    // 1. Initialiser et vérifier WebAssembly
    const isWasmReady = await checkWasm();
    if (!isWasmReady) {
        console.error(`${RED}${BOLD}Error:${RESET} Failed to load the LibreDWG WebAssembly engine.`);
        process.exit(1);
    }

    // 2. Extraire les options
    let timeout = 30000;
    const timeoutIdx = args.indexOf('--timeout');
    if (timeoutIdx !== -1 && args[timeoutIdx + 1]) {
        timeout = parseInt(args[timeoutIdx + 1], 10) || 30000;
        args.splice(timeoutIdx, 2);
    }

    const isBatch = args.includes('-b') || args.includes('--batch');
    if (isBatch) {
        // Enlever le flag batch pour plus de simplicité dans le parsing des fichiers
        const bIdx = args.findIndex(arg => arg === '-b' || arg === '--batch');
        if (bIdx !== -1) args.splice(bIdx, 1);

        // Trouver l'option de sortie (-o ou --output)
        let outputDir = null;
        const oIdx = args.findIndex(arg => arg === '-o' || arg === '--output');
        if (oIdx !== -1) {
            outputDir = args[oIdx + 1];
            args.splice(oIdx, 2);
        } else {
            // Par défaut, le dernier argument est considéré comme le dossier de sortie
            outputDir = args.pop();
        }

        if (!outputDir) {
            console.error(`${RED}${BOLD}Error:${RESET} Output directory is required for batch conversion.`);
            console.error(`Use -o <dir> or specify the directory as the last argument.`);
            process.exit(1);
        }

        const inputFiles = args.filter(file => file.toLowerCase().endsWith('.dwg'));
        if (inputFiles.length === 0) {
            console.error(`${RED}${BOLD}Error:${RESET} No valid .dwg files provided for batch conversion.`);
            process.exit(1);
        }

        console.log(`${BOLD}${CYAN}Starting batch conversion of ${inputFiles.length} files...${RESET}\n`);
        
        const results = await convertDwgToDxf(inputFiles, outputDir, { timeout });
        let successCount = 0;

        for (let i = 0; i < inputFiles.length; i++) {
            const file = inputFiles[i];
            const result = results[i];

            if (result.success) {
                successCount++;
                const sizeKb = (result.fileSize / 1024).toFixed(1);
                console.log(`  [${i + 1}/${inputFiles.length}] ${GREEN}✓${RESET} ${file} -> ${result.outputPath} (${sizeKb} KB, ${result.duration}ms)`);
                if (result.warnings) {
                    for (const warning of result.warnings) {
                        console.log(`      ${YELLOW}⚠ Warning:${RESET} ${warning}`);
                    }
                }
            } else {
                console.log(`  [${i + 1}/${inputFiles.length}] ${RED}✗${RESET} ${file} failed: ${result.error}`);
            }
        }

        console.log(`\n${BOLD}Batch Finished:${RESET} ${GREEN}${successCount} succeeded${RESET}, ${RED}${inputFiles.length - successCount} failed${RESET}.`);
        process.exit(successCount === inputFiles.length ? 0 : 1);

    } else {
        // Mode unitaire standard
        // Trouver -o ou --output s'il est spécifié explicitement
        let inputPath = null;
        let outputPath = null;

        const oIdx = args.findIndex(arg => arg === '-o' || arg === '--output');
        if (oIdx !== -1) {
            outputPath = args[oIdx + 1];
            args.splice(oIdx, 2);
            inputPath = args[0];
        } else {
            inputPath = args[0];
            outputPath = args[1];
        }

        if (!inputPath || !outputPath) {
            console.error(`${RED}${BOLD}Error:${RESET} Missing input .dwg file or output .dxf file path.`);
            showHelp();
            process.exit(1);
        }

        console.log(`${BOLD}${CYAN}Converting:${RESET} ${inputPath} -> ${outputPath}...`);
        const result = await convertDwgToDxf(inputPath, outputPath, { timeout });

        if (result.success) {
            const sizeKb = (result.fileSize / 1024).toFixed(1);
            console.log(`\n${GREEN}${BOLD}✓ Conversion succeeded!${RESET}`);
            console.log(`📁 ${BOLD}Output:${RESET} ${result.outputPath}`);
            console.log(`⏱ ${BOLD}Duration:${RESET} ${result.duration}ms`);
            console.log(`⚖ ${BOLD}Size:${RESET} ${sizeKb} KB`);
            if (result.warnings) {
                console.log(`\n${YELLOW}${BOLD}⚠ Warnings occurred during conversion:${RESET}`);
                for (const warning of result.warnings) {
                    console.log(`  - ${warning}`);
                }
            }
            process.exit(0);
        } else {
            console.error(`\n${RED}${BOLD}✗ Conversion failed!${RESET}`);
            console.error(`❌ ${BOLD}Reason:${RESET} ${result.error}`);
            process.exit(1);
        }
    }
}

run().catch(err => {
    console.error(`\n${RED}${BOLD}Fatal Error:${RESET}`, err.message);
    process.exit(1);
});
