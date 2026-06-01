const fs = require('fs/promises');
const path = require('path');
const { loadWasm } = require('./wasm-loader');

const LIBREDWG_WARNINGS = {
    1: "DWG_ERR_WRONGCRC: CRC checksum mismatch (some entities/data might have wrong checksums).",
    2: "DWG_ERR_NOTYETSUPPORTED: Feature/version not yet supported (some elements might be skipped).",
    4: "DWG_ERR_UNHANDLEDCLASS: Unhandled entity class (some entity types are not supported and were skipped).",
    8: "DWG_ERR_INVALIDTYPE: Invalid entity type (some invalid entity types were encountered).",
    16: "DWG_ERR_INVALIDHANDLE: Invalid handle reference (some object handle links might be broken).",
    32: "DWG_ERR_INVALIDEED: Invalid extended entity data (EED might be ignored).",
    64: "DWG_ERR_VALUEOUTOFBOUNDS: Value out of bounds (some numeric fields were out of their expected ranges)."
};

const LIBREDWG_CRITICAL_ERRORS = {
    128: "DWG_ERR_CLASSESNOTFOUND: Classes section not found or missing.",
    256: "DWG_ERR_SECTIONNOTFOUND: Required section not found in the DWG file.",
    512: "DWG_ERR_PAGENOTFOUND: Data page not found in the DWG file.",
    1024: "DWG_ERR_INTERNALERROR: Internal LibreDWG engine error.",
    2048: "DWG_ERR_INVALIDDWG: The file is not a valid DWG file or is corrupted.",
    4096: "DWG_ERR_IOERROR: File input/output reading/writing error.",
    8192: "DWG_ERR_OUTOFMEM: Library ran out of memory during parsing."
};

/**
 * Analyse le code de retour LibreDWG pour extraire les avertissements et erreurs.
 * @param {number} exitCode - Code de retour
 */
function parseLibreDwgCode(exitCode) {
    const warnings = [];
    const errors = [];

    if (exitCode === -1) {
        errors.push("Failed to open destination DXF file on disk (IO error).");
        return { warnings, errors };
    }

    // Vérifier les bits d'avertissement (< 128)
    for (const [bit, desc] of Object.entries(LIBREDWG_WARNINGS)) {
        const bitVal = parseInt(bit, 10);
        if ((exitCode & bitVal) === bitVal) {
            warnings.push(desc);
        }
    }

    // Vérifier les bits d'erreur critique (>= 128)
    for (const [bit, desc] of Object.entries(LIBREDWG_CRITICAL_ERRORS)) {
        const bitVal = parseInt(bit, 10);
        if ((exitCode & bitVal) === bitVal) {
            errors.push(desc);
        }
    }

    // Fallbacks si aucun bit spécifique n'est détecté
    if (exitCode >= 128 && errors.length === 0) {
        errors.push(`Critical error code ${exitCode}`);
    } else if (exitCode > 0 && exitCode < 128 && warnings.length === 0) {
        warnings.push(`Warning code ${exitCode}`);
    }

    return { warnings, errors };
}

/**
 * Exécute une fonction asynchrone avec un timeout.
 */
function withTimeout(promise, ms, timeoutErrorMsg) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(timeoutErrorMsg));
        }, ms);
    });

    return Promise.race([
        promise,
        timeoutPromise
    ]).finally(() => {
        clearTimeout(timeoutId);
    });
}

/**
 * Convertit un fichier DWG en DXF via le module WebAssembly LibreDWG.
 * Supporte aussi la conversion en lot (batch) si un tableau de chemins d'entrée est fourni.
 *
 * @param {string|string[]} inputPath - Chemin du fichier DWG d'entrée (ou tableau de chemins)
 * @param {string} outputPath - Chemin du fichier DXF de sortie (ou dossier de sortie en mode batch)
 * @param {Object} [options] - Options de conversion
 * @param {number} [options.timeout=30000] - Timeout en millisecondes
 * @returns {Promise<Object|Object[]>} Résultat de la conversion
 */
async function convertDwgToDxf(inputPath, outputPath, options = {}) {
    // Mode BATCH (En lot)
    if (Array.isArray(inputPath)) {
        const inputPaths = inputPath;
        const outputDir = outputPath;

        if (!outputDir) {
            return {
                success: false,
                outputPath: null,
                duration: 0,
                fileSize: 0,
                error: "Dossier de sortie non spécifié pour la conversion en lot.",
                warnings: null
            };
        }

        const startTime = Date.now();
        const results = [];

        try {
            await fs.mkdir(outputDir, { recursive: true });
        } catch (err) {
            return {
                success: false,
                outputPath: null,
                duration: Date.now() - startTime,
                fileSize: 0,
                error: `Impossible de créer le dossier de sortie : ${outputDir}`,
                warnings: null
            };
        }

        for (const input of inputPaths) {
            const ext = path.extname(input);
            const base = path.basename(input, ext);
            const targetOutput = path.join(outputDir, `${base}.dxf`);

            // Exécution séquentielle pour éviter les conflits dans le FS virtuel Wasm
            const singleResult = await convertDwgToDxf(input, targetOutput, options);
            results.push(singleResult);
        }

        return results;
    }

    // Mode UNITAIRE (Fichier individuel)
    const timeoutMs = options.timeout || 30000;
    const startTime = Date.now();
    
    const result = {
        success: false,
        outputPath: null,
        duration: 0,
        fileSize: 0,
        error: null,
        warnings: null
    };

    try {
        // 1. Validation de l'entrée
        if (!inputPath || !inputPath.toLowerCase().endsWith('.dwg')) {
            throw new Error("L'extension du fichier d'entrée est incorrecte (doit être .dwg).");
        }

        let inputBuffer;
        try {
            inputBuffer = await fs.readFile(inputPath);
        } catch (err) {
            throw new Error(`Fichier d'entrée introuvable ou illisible : ${inputPath}`);
        }

        // 2. Vérification magique rapide (DWG commence souvent par AC10)
        const magic = inputBuffer.toString('ascii', 0, 4);
        if (magic !== 'AC10' && magic !== 'AC1.' && magic !== 'AC15') {
            throw new Error("Le fichier est corrompu ou n'est pas un fichier DWG valide.");
        }

        // 3. Exécution avec timeout
        await withTimeout(
            (async () => {
                // Chargement du module Wasm
                const wasm = await loadWasm();
                
                const virtualIn = `input_${Date.now()}_${Math.floor(Math.random() * 1000)}.dwg`;
                const virtualOut = `output_${Date.now()}_${Math.floor(Math.random() * 1000)}.dxf`;

                try {
                    // Écriture dans le système de fichiers virtuel
                    wasm.FS.writeFile(virtualIn, inputBuffer);
                    
                    // Récupération de la fonction wrapper C
                    const convertFn = wasm.cwrap('convert_dwg_to_dxf', 'number', ['string', 'string']);
                    
                    // Exécution de la conversion
                    const exitCode = convertFn(virtualIn, virtualOut);
                    
                    // Analyse du code de retour
                    const { warnings, errors } = parseLibreDwgCode(exitCode);

                    if (errors.length > 0) {
                        throw new Error(errors.join(" | "));
                    }

                    if (warnings.length > 0) {
                        result.warnings = warnings;
                    }

                    // Récupération du résultat depuis le FS virtuel
                    const outputBuffer = wasm.FS.readFile(virtualOut);
                    
                    try {
                        // S'assurer que le dossier parent de la sortie existe
                        await fs.mkdir(path.dirname(outputPath), { recursive: true });
                        await fs.writeFile(outputPath, outputBuffer);
                    } catch (err) {
                        throw new Error(`Erreur d'écriture du fichier de sortie : ${outputPath}`);
                    }

                    // Récupération des statistiques physiques du fichier généré
                    const stats = await fs.stat(outputPath);
                    result.fileSize = stats.size;
                    
                } finally {
                    // Nettoyage impératif du FS virtuel
                    try {
                        wasm.FS.unlink(virtualIn);
                    } catch (e) { /* ignore */ }
                    try {
                        wasm.FS.unlink(virtualOut);
                    } catch (e) { /* ignore */ }
                }
            })(),
            timeoutMs,
            "Timeout dépassé lors de la conversion."
        );

        result.success = true;
        result.outputPath = outputPath;

    } catch (err) {
        result.error = err.message;
    } finally {
        result.duration = Date.now() - startTime;
    }

    return result;
}

module.exports = {
    convertDwgToDxf
};

