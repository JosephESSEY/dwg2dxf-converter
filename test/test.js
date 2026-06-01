const assert = require('assert');
const fs = require('fs/promises');
const path = require('path');
const { execSync } = require('child_process');
const { checkWasm, convertDwgToDxf } = require('../index');

const fixturesDir = path.join(__dirname, 'fixtures');
const outputDir = path.join(__dirname, 'output');

// Chemical test fixtures paths
const r11Dwg = path.join(fixturesDir, 'r11_entities.dwg');
const r14Dwg = path.join(fixturesDir, 'r14_leader.dwg');
const r14DxfExpected = path.join(fixturesDir, 'r14_leader.dxf');
const s2000Dwg = path.join(fixturesDir, 'sample_2000.dwg');
const s2000DxfExpected = path.join(fixturesDir, 'sample_2000.dxf');
const s2018Dwg = path.join(fixturesDir, 'sample_2018.dwg');
const s2018DxfExpected = path.join(fixturesDir, 'sample_2018.dxf');

/**
 * Vide le contenu d'un dossier sans supprimer le dossier lui-même.
 */
async function clearDirectory(dir) {
    try {
        const files = await fs.readdir(dir);
        for (const file of files) {
            await fs.rm(path.join(dir, file), { recursive: true, force: true });
        }
    } catch (err) {
        // Ignorer si le dossier n'existe pas encore
    }
}

/**
 * Valide sommairement qu'un fichier généré est un DXF valide.
 */
async function validateDxfStructure(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const trimmed = content.trim();
        // Un fichier DXF se termine par EOF et doit contenir des sections/headers
        const hasEof = trimmed.endsWith('EOF');
        const hasHeaderOrEntities = trimmed.includes('SECTION') || trimmed.includes('HEADER') || trimmed.includes('ENTITIES');
        return hasEof && hasHeaderOrEntities;
    } catch (err) {
        return false;
    }
}

async function runTests() {
    console.log("=== Début de la suite de tests étendue ===\n");
    let passedCount = 0;
    let totalTests = 0;

    // S'assurer que le dossier de sortie existe et est propre
    await fs.mkdir(outputDir, { recursive: true });
    await clearDirectory(outputDir);

    const testCases = [];

    // =========================================================
    // TEST 1 — Chargement Wasm
    // =========================================================
    totalTests++;
    try {
        const isLoaded = await checkWasm();
        assert.strictEqual(isLoaded, true, "checkWasm() doit retourner true");
        console.log("✅ TEST 1 — Chargement WebAssembly : OK");
        passedCount++;
    } catch (err) {
        console.error("❌ TEST 1 Échec :", err.message);
    }

    // =========================================================
    // TEST 2 — Conversion DWG 2000 (sample_2000.dwg)
    // =========================================================
    totalTests++;
    try {
        const outPath = path.join(outputDir, 'sample_2000.dxf');
        const result = await convertDwgToDxf(s2000Dwg, outPath);
        
        assert.strictEqual(result.success, true, `La conversion 2000 doit réussir. Erreur: ${result.error}`);
        assert.ok(result.fileSize > 0, "La taille du fichier généré doit être > 0");
        assert.strictEqual(result.outputPath, outPath, "Le chemin de sortie doit correspondre");
        
        const isValid = await validateDxfStructure(outPath);
        assert.strictEqual(isValid, true, "Le fichier de sortie doit avoir une structure DXF valide (se terminant par EOF)");
        
        console.log(`✅ TEST 2 — Conversion AutoCAD 2000 -> DXF : OK (${result.duration}ms, ${(result.fileSize / 1024).toFixed(1)} KB)`);
        passedCount++;
    } catch (err) {
        console.error("❌ TEST 2 Échec :", err.message);
    }

    // =========================================================
    // TEST 3 — Conversion AutoCAD 2018 (sample_2018.dwg)
    // =========================================================
    totalTests++;
    try {
        const outPath = path.join(outputDir, 'sample_2018.dxf');
        const result = await convertDwgToDxf(s2018Dwg, outPath);
        
        assert.strictEqual(result.success, true, `La conversion 2018 doit réussir. Erreur: ${result.error}`);
        assert.ok(result.fileSize > 0, "La taille du fichier généré doit être > 0");
        
        const isValid = await validateDxfStructure(outPath);
        assert.strictEqual(isValid, true, "Le fichier 2018 converti doit avoir une structure DXF valide");
        
        console.log(`✅ TEST 3 — Conversion AutoCAD 2018 -> DXF : OK (${result.duration}ms, ${(result.fileSize / 1024).toFixed(1)} KB)`);
        passedCount++;
    } catch (err) {
        console.error("❌ TEST 3 Échec :", err.message);
    }

    // =========================================================
    // TEST 4 — Conversion AutoCAD R14 (r14_leader.dwg)
    // =========================================================
    totalTests++;
    try {
        const outPath = path.join(outputDir, 'r14_leader.dxf');
        const result = await convertDwgToDxf(r14Dwg, outPath);
        
        assert.strictEqual(result.success, true, `La conversion R14 doit réussir. Erreur: ${result.error}`);
        assert.ok(result.fileSize > 0, "La taille du fichier généré doit être > 0");
        
        const isValid = await validateDxfStructure(outPath);
        assert.strictEqual(isValid, true, "Le fichier R14 converti doit avoir une structure DXF valide");
        
        console.log(`✅ TEST 4 — Conversion AutoCAD R14 -> DXF : OK (${result.duration}ms, ${(result.fileSize / 1024).toFixed(1)} KB)`);
        passedCount++;
    } catch (err) {
        console.error("❌ TEST 4 Échec :", err.message);
    }

    // =========================================================
    // TEST 5 — Avertissements de Conversion (r14_constraints.dwg)
    // =========================================================
    totalTests++;
    try {
        const constraintsDwg = path.join(fixturesDir, 'r14_constraints.dwg');
        const outPath = path.join(outputDir, 'r14_constraints.dxf');
        const result = await convertDwgToDxf(constraintsDwg, outPath);
        
        // R14 Constraints contient des structures de contraintes avancées qui déclenchent des warnings
        // non critiques (comme out of bounds), mais la conversion produit un DXF complet
        assert.strictEqual(result.success, true, "La conversion R14 Constraints doit réussir malgré les avertissements");
        assert.ok(result.fileSize > 0, "Le fichier DXF doit être généré et non vide");
        assert.ok(Array.isArray(result.warnings) && result.warnings.length > 0, "Des avertissements de conversion doivent être détectés");
        
        console.log(`✅ TEST 5 — Gestion des Avertissements (R14 Constraints) : OK (Succès avec ${result.warnings.length} avertissement(s))`);
        passedCount++;
    } catch (err) {
        console.error("❌ TEST 5 Échec :", err.message);
    }

    // =========================================================
    // TEST 6 — Gestion des Erreurs (Fichier corrompu)
    // =========================================================
    totalTests++;
    try {
        const corruptFile = path.join(outputDir, 'corrupt.dwg');
        await fs.writeFile(corruptFile, 'AC10corrompupadedu toutun fichierdwgvalide');
        
        const outPath = path.join(outputDir, 'corrupt.dxf');
        const result = await convertDwgToDxf(corruptFile, outPath);
        
        assert.strictEqual(result.success, false, "La conversion d'un fichier corrompu doit échouer");
        assert.ok(result.error !== null, "Un message d'erreur doit être retourné");
        assert.ok(result.error.includes("corrompu") || result.error.includes("valide") || result.error.includes("invalid") || result.error.includes("corrupted"), "L'erreur doit mentionner que le fichier est invalide/corrompu");
        
        console.log("✅ TEST 6 — Détection de fichier corrompu : OK");
        passedCount++;
    } catch (err) {
        console.error("❌ TEST 6 Échec :", err.message);
    }

    // =========================================================
    // TEST 7 — Conversion en Lot (Batch)
    // =========================================================
    totalTests++;
    try {
        const batchInputDir = [s2000Dwg, s2018Dwg];
        const batchOutputDir = path.join(outputDir, 'batch_test');
        
        const results = await convertDwgToDxf(batchInputDir, batchOutputDir);
        
        assert.ok(Array.isArray(results), "La conversion en lot doit retourner un tableau");
        assert.strictEqual(results.length, 2, "Le tableau de résultats doit contenir 2 éléments");
        assert.strictEqual(results[0].success, true, "Le premier fichier doit réussir");
        assert.strictEqual(results[1].success, true, "Le second fichier doit réussir");
        
        const file1 = path.join(batchOutputDir, 'sample_2000.dxf');
        const file2 = path.join(batchOutputDir, 'sample_2018.dxf');
        
        const isF1Valid = await validateDxfStructure(file1);
        const isF2Valid = await validateDxfStructure(file2);
        
        assert.strictEqual(isF1Valid && isF2Valid, true, "Les deux fichiers du lot doivent posséder une structure DXF valide");
        
        console.log("✅ TEST 7 — Conversion en Lot (Batch) : OK");
        passedCount++;
    } catch (err) {
        console.error("❌ TEST 7 Échec :", err.message);
    }

    // =========================================================
    // TEST 8 — CLI (Command Line Interface)
    // =========================================================
    totalTests++;
    try {
        const cliScript = path.join(__dirname, '..', 'bin', 'cli.js');
        
        // Tester --version
        const versionOutput = execSync(`node "${cliScript}" --version`, { encoding: 'utf-8' });
        assert.ok(versionOutput.includes("dwg2dxf-converter wrapper"), "Le CLI doit afficher le wrapper");
        assert.ok(versionOutput.includes("LibreDWG engine"), "Le CLI doit afficher le moteur LibreDWG");
        
        // Tester la conversion unitaire via CLI
        const outPath = path.join(outputDir, 'cli_out.dxf');
        execSync(`node "${cliScript}" "${s2000Dwg}" "${outPath}"`, { encoding: 'utf-8' });
        
        const isValid = await validateDxfStructure(outPath);
        assert.strictEqual(isValid, true, "Le fichier converti par le CLI doit posséder une structure DXF valide");
        
        console.log("✅ TEST 8 — Command Line Interface (CLI) : OK");
        passedCount++;
    } catch (err) {
        console.error("❌ TEST 8 Échec :", err.message);
    }

    console.log(`\n──────────────────────────────────────────────────`);
    console.log(`Résultats finaux : ${passedCount}/${totalTests} tests réussis.`);
    console.log(`──────────────────────────────────────────────────\n`);

    if (passedCount !== totalTests) {
        process.exit(1);
    }
}

runTests();
