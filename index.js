const { convertDwgToDxf } = require('./lib/converter');
const { loadWasm } = require('./lib/wasm-loader');
const pkg = require('./package.json');

/**
 * Vérifie si le module WebAssembly peut être chargé et retourne sa disponibilité.
 * @returns {Promise<boolean>} true si chargé avec succès, false sinon
 */
async function checkWasm() {
    try {
        await loadWasm();
        return true;
    } catch (err) {
        return false;
    }
}

module.exports = {
    convertDwgToDxf,
    checkWasm,
    VERSION: pkg.version
};
