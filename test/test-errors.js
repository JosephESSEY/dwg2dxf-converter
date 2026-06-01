const path = require('path');
const fs = require('fs/promises');
const { convertDwgToDxf } = require('../index');

const outputDir = path.join(__dirname, 'output');
const fixturesDir = path.join(__dirname, 'fixtures');

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";

async function run() {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`${BOLD}${CYAN}=== Diagnostic des retours d'erreurs et avertissements ===${RESET}\n`);

    // ─────────────────────────────────────────────────────────
    // CAS 1 — Extension incorrecte (Erreur de Validation)
    // ─────────────────────────────────────────────────────────
    console.log(`${BOLD}1. Erreur d'extension (Fichier d'entrée non .dwg)${RESET}`);
    const res1 = await convertDwgToDxf('plan.pdf', 'output.dxf');
    console.log(`   ${RED}✗ success:${RESET} ${res1.success}`);
    console.log(`   ${RED}✗ error:${RESET} ${res1.error}\n`);

    // ─────────────────────────────────────────────────────────
    // CAS 2 — Fichier inexistant (Erreur IO)
    // ─────────────────────────────────────────────────────────
    console.log(`${BOLD}2. Fichier d'entrée introuvable (Erreur d'accès)${RESET}`);
    const res2 = await convertDwgToDxf('test/fixtures/non_existant.dwg', 'output.dxf');
    console.log(`   ${RED}✗ success:${RESET} ${res2.success}`);
    console.log(`   ${RED}✗ error:${RESET} ${res2.error}\n`);

    // ─────────────────────────────────────────────────────────
    // CAS 3 — Fichier sans en-tête DWG (Validation magique)
    // ─────────────────────────────────────────────────────────
    console.log(`${BOLD}3. Fichier non DWG (Validation magique de signature)${RESET}`);
    const textFile = path.join(outputDir, 'not_a_dwg.dwg');
    await fs.writeFile(textFile, 'Ceci est un fichier texte brut et non un fichier DAO.');
    
    const res3 = await convertDwgToDxf(textFile, 'output.dxf');
    console.log(`   ${RED}✗ success:${RESET} ${res3.success}`);
    console.log(`   ${RED}✗ error:${RESET} ${res3.error}\n`);

    // ─────────────────────────────────────────────────────────
    // CAS 4 — Fichier corrompu (Erreur critique LibreDWG)
    // ─────────────────────────────────────────────────────────
    console.log(`${BOLD}4. Fichier DWG corrompu (Erreur critique détectée par le moteur Wasm)${RESET}`);
    const corruptFile = path.join(outputDir, 'corrupt_data.dwg');
    // Commence par AC10 pour tromper la validation magique rapide, mais données aléatoires ensuite
    await fs.writeFile(corruptFile, 'AC10corrupteddatabytes_random_content_1234567890');
    
    const res4 = await convertDwgToDxf(corruptFile, 'output.dxf');
    console.log(`   ${RED}✗ success:${RESET} ${res4.success}`);
    console.log(`   ${RED}✗ error:${RESET} ${res4.error}\n`);

    // ─────────────────────────────────────────────────────────
    // CAS 5 — Avertissement non critique (Exemple : Valeur hors limites)
    // ─────────────────────────────────────────────────────────
    console.log(`${BOLD}5. Avertissement de conversion (DWG valide avec contraintes hors limites)${RESET}`);
    const constraintsFile = path.join(fixturesDir, 'r14_constraints.dwg');
    const dxfOut = path.join(outputDir, 'constraints_diagnostic.dxf');
    
    const res5 = await convertDwgToDxf(constraintsFile, dxfOut);
    console.log(`   ${GREEN}✓ success:${RESET} ${res5.success}`);
    console.log(`   ${GREEN}✓ outputPath:${RESET} ${res5.outputPath}`);
    console.log(`   ${YELLOW}⚠ warnings:${RESET}`);
    if (res5.warnings) {
        res5.warnings.forEach(warning => console.log(`     - ${warning}`));
    } else {
        console.log("     Aucun avertissement.");
    }
    console.log();
}

run();
