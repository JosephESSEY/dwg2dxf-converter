const fs = require('fs/promises');
const path = require('path');
const { loadWasm } = require('./wasm-loader');

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
 *
 * @param {string} inputPath - Chemin du fichier DWG d'entrée
 * @param {string} outputPath - Chemin du fichier DXF de sortie
 * @param {Object} [options] - Options de conversion
 * @param {number} [options.timeout=30000] - Timeout en millisecondes
 * @returns {Promise<Object>} Résultat de la conversion
 */
async function convertDwgToDxf(inputPath, outputPath, options = {}) {
    const timeoutMs = options.timeout || 30000;
    const startTime = Date.now();
    
    const result = {
        success: false,
        outputPath: null,
        duration: 0,
        fileSize: 0,
        error: null
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
                
                const virtualIn = 'input.dwg';
                const virtualOut = 'output.dxf';

                try {
                    // Écriture dans le système de fichiers virtuel
                    wasm.FS.writeFile(virtualIn, inputBuffer);
                    
                    // Récupération de la fonction wrapper compilée en C
                    const convertFn = wasm.cwrap('_convert_dwg_to_dxf', 'number', ['string', 'string']);
                    
                    // Exécution de la conversion
                    const exitCode = convertFn(virtualIn, virtualOut);
                    
                    if (exitCode !== 0) {
                        if (exitCode === 1 || exitCode > 1) { // DWG_ERR_CRITICAL or similar
                            throw new Error(`Version DWG non supportée ou erreur interne LibreDWG (code ${exitCode}).`);
                        }
                        throw new Error(`Erreur interne du module Wasm lors de la conversion (code ${exitCode}).`);
                    }

                    // Récupération du résultat depuis le FS virtuel
                    const outputBuffer = wasm.FS.readFile(virtualOut);
                    
                    try {
                        await fs.writeFile(outputPath, outputBuffer);
                    } catch (err) {
                        throw new Error(`Erreur d'écriture du fichier de sortie : ${outputPath}`);
                    }

                    // Stat file size
                    const stats = await fs.stat(outputPath);
                    result.fileSize = stats.size;
                    
                } finally {
                    // Nettoyage impératif du système de fichiers virtuel pour éviter les fuites mémoire
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
