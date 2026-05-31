const assert = require('assert');
const fs = require('fs/promises');
const path = require('path');
const { checkWasm, convertDwgToDxf } = require('../index');

const fixturesDir = path.join(__dirname, 'fixtures');
const outputDir = path.join(__dirname, 'output');
const validDwgPath = path.join(fixturesDir, 'valid.dwg');
const corruptedDwgPath = path.join(fixturesDir, 'corrupted.dwg');
const validDxfPath = path.join(outputDir, 'valid.dxf');

async function runTests() {
    console.log("Démarrage de la suite de tests...\n");
    let passedCount = 0;
    const totalTests = 5;

    try {
        // Préparation : créer les dossiers et fichiers de test
        await fs.mkdir(outputDir, { recursive: true });
        await fs.mkdir(fixturesDir, { recursive: true });

        // Simuler un fichier DWG valide (le magic byte doit être AC10xxx)
        if (await fs.access(validDwgPath).catch(() => true)) {
            await fs.writeFile(validDwgPath, Buffer.from("AC1015 Dummy Valid DWG File"));
        }
        
        // Simuler un fichier DWG corrompu (un fichier texte simple sans magic byte)
        if (await fs.access(corruptedDwgPath).catch(() => true)) {
            await fs.writeFile(corruptedDwgPath, Buffer.from("Ce n'est pas un fichier DWG !"));
        }

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
        // TEST 2 — Conversion fichier valide
        // =========================================================
        const result2 = await convertDwgToDxf(validDwgPath, validDxfPath);
        assert.strictEqual(result2.success, true, "La conversion d'un fichier valide doit réussir");
        assert.ok(result2.duration > 0, "La durée doit être supérieure à 0");
        assert.ok(result2.fileSize > 0, "La taille du fichier généré doit être supérieure à 0");
        
        // Vérification de la création effective
        const stat2 = await fs.stat(validDxfPath);
        assert.ok(stat2.size > 0, "Le fichier de sortie physique doit exister et ne pas être vide");
        console.log(`✅ TEST 2 — Conversion valide : OK (${result2.duration}ms, ${(result2.fileSize / 1024).toFixed(1)}KB)`);
        passedCount++;

        // =========================================================
        // TEST 3 — Fichier inexistant
        // =========================================================
        const result3 = await convertDwgToDxf(path.join(fixturesDir, 'does-not-exist.dwg'), path.join(outputDir, 'out.dxf'));
        assert.strictEqual(result3.success, false, "La conversion doit échouer si le fichier n'existe pas");
        assert.ok(result3.error && result3.error.includes("introuvable"), "L'erreur doit mentionner 'introuvable'");
        console.log(`✅ TEST 3 — Fichier inexistant : OK`);
        passedCount++;

        // =========================================================
        // TEST 4 — Fichier corrompu
        // =========================================================
        const result4 = await convertDwgToDxf(corruptedDwgPath, path.join(outputDir, 'corrupted.dxf'));
        assert.strictEqual(result4.success, false, "La conversion doit échouer pour un fichier corrompu");
        assert.ok(result4.error !== null, "L'objet result.error ne doit pas être null");
        console.log(`✅ TEST 4 — Fichier corrompu : OK`);
        passedCount++;

        // =========================================================
        // TEST 5 — Performance
        // =========================================================
        const result5 = await convertDwgToDxf(validDwgPath, path.join(outputDir, 'perf.dxf'));
        assert.strictEqual(result5.success, true, "La conversion doit réussir");
        if (result5.duration > 5000) {
            console.log(`⚠️  TEST 5 — Performance : ${result5.duration}ms (dépasse 5s)`);
        } else {
            console.log(`✅ TEST 5 — Performance : OK (${result5.duration}ms)`);
        }
        passedCount++;

    } catch (err) {
        console.error(`\n❌ Échec inattendu durant les tests :`, err.message);
    } finally {
        console.log(`─────────────────────────────`);
        console.log(`Résultat : ${passedCount}/${totalTests} tests passés\n`);
        
        console.log(`Pour obtenir un fichier de test 'valid.dwg' 100% gratuit et légal, vous pouvez télécharger des fichiers de démonstration sur le dépôt open-source LibreDWG : https://github.com/LibreDWG/libredwg/tree/master/test/test-data`);
    }
}

runTests();
