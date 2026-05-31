const assert = require('assert');
const fs = require('fs/promises');
const path = require('path');
const { checkWasm, convertDwgToDxf } = require('../index');

const fixturesDir = path.join(__dirname, 'fixtures');
const outputDir = path.join(__dirname, 'output');
const circleDwgPath = path.join(fixturesDir, 'circle.dwg');
const circleDxfPath = path.join(outputDir, 'circle.dxf');

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

async function runTests() {
    console.log("Démarrage de la suite de tests avec le fichier circle.dwg...\n");
    let passedCount = 0;
    const totalTests = 3;

    try {
        // 1. Nettoyer le dossier de sortie et s'assurer que les dossiers existent
        await fs.mkdir(fixturesDir, { recursive: true });
        await fs.mkdir(outputDir, { recursive: true });
        await clearDirectory(outputDir);

        // 2. S'assurer que le fichier circle.dwg est présent dans fixtures/
        try {
            await fs.access(circleDwgPath);
        } catch (err) {
            // S'il est manquant localement, tenter de le copier depuis le submodule LibreDWG
            const sampleSource = path.join(__dirname, '..', 'libredwg', 'test', 'test-data', '2000', 'circle.dwg');
            await fs.copyFile(sampleSource, circleDwgPath);
            console.log("📂 Fichier 'circle.dwg' copié depuis LibreDWG dans 'fixtures/'.");
        }
        console.log("📂 Dossier de sortie 'output/' nettoyé.\n");

        // =========================================================
        // TEST 1 — Chargement Wasm
        // =========================================================
        const t1Start = Date.now();
        const isLoaded = await checkWasm();
        const t1Dur = Date.now() - t1Start;
        assert.strictEqual(isLoaded, true, "checkWasm() doit retourner true");
        console.log(`✅ TEST 1 — Chargement Wasm : OK (${t1Dur}ms)`);
        passedCount++;

        // =========================================================
        // TEST 2 — Conversion fichier circle.dwg (AutoCAD 2000)
        // =========================================================
        const result2 = await convertDwgToDxf(circleDwgPath, circleDxfPath);
        if (!result2.success) {
            console.error("❌ TEST 2 Échec - Détails de l'erreur :", result2.error);
        }
        assert.strictEqual(result2.success, true, `La conversion doit réussir. Erreur: ${result2.error}`);
        assert.ok(result2.duration > 0, "La durée doit être supérieure à 0");
        assert.ok(result2.fileSize > 0, "La taille du fichier généré doit être supérieure à 0");
        
        // Vérification de l'existence physique du fichier de sortie
        const stat2 = await fs.stat(circleDxfPath);
        assert.ok(stat2.size > 0, "Le fichier circle.dxf de sortie doit exister et ne pas être vide");
        console.log(`✅ TEST 2 — Conversion circle.dwg -> circle.dxf : OK (${result2.duration}ms, ${(result2.fileSize / 1024).toFixed(1)}KB)`);
        passedCount++;

        // =========================================================
        // TEST 3 — Performance (Re-conversion)
        // =========================================================
        const result3 = await convertDwgToDxf(circleDwgPath, circleDxfPath);
        assert.strictEqual(result3.success, true, "La deuxième conversion doit réussir");
        if (result3.duration > 5000) {
            console.log(`⚠️  TEST 3 — Performance : ${result3.duration}ms (dépasse 5s)`);
        } else {
            console.log(`✅ TEST 3 — Performance (Chaude) : OK (${result3.duration}ms)`);
        }
        passedCount++;

    } catch (err) {
        console.error(`\n❌ Échec inattendu durant les tests :`, err.message);
    } finally {
        console.log(`─────────────────────────────`);
        console.log(`Résultat : ${passedCount}/${totalTests} tests passés\n`);
    }
}

runTests();
