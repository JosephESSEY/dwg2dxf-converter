// lib/wasm-loader.js
const LibreDWG = require('../wasm/libredwg.js');

let wasmInstance = null;
let initPromise = null;

/**
 * Charge le module WebAssembly en mode singleton.
 * @returns {Promise<Object>} L'instance du module Wasm
 */
async function loadWasm() {
    if (wasmInstance) {
        return wasmInstance;
    }

    if (!initPromise) {
        initPromise = new Promise(async (resolve, reject) => {
            try {
                const startTime = Date.now();
                // Emscripten MODULARIZE=1 retourne une fonction (Promise)
                const instance = await LibreDWG();
                const duration = Date.now() - startTime;
                
                // Log discret (uniquement utile en dev ou premier chargement)
                // console.debug(`[dwg2dxf] Module WebAssembly chargé en ${duration}ms`);
                
                wasmInstance = instance;
                resolve(instance);
            } catch (err) {
                reject(new Error(`Impossible de charger le module WebAssembly LibreDWG : ${err.message}`));
            }
        });
    }

    return initPromise;
}

module.exports = {
    loadWasm
};
