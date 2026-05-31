# dwg2dxf

![NPM Version](https://img.shields.io/npm/v/dwg2dxf)
![License](https://img.shields.io/npm/l/dwg2dxf)
![Node Version](https://img.shields.io/node/v/dwg2dxf)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

## Description

`dwg2dxf` est un package Node.js professionnel permettant de convertir des fichiers CAO au format `.dwg` vers le format `.dxf` (compatible AutoCAD 2000/2004 et supérieur). 

Conçu pour des environnements de production rigoureux, ce package est **100% autonome**. Il n'a besoin d'aucune dépendance système externe (pas besoin d'installer LibreDWG, Python, ou des compilateurs C++ sur le serveur cible). Le moteur de conversion GNU LibreDWG est pré-compilé en **WebAssembly (Wasm)**, ce qui le rend universellement compatible (Windows, macOS, Linux) et très rapide.

## Installation

Installez simplement via npm (aucune configuration native requise) :

```bash
npm install dwg2dxf
```

## Utilisation rapide

Voici l'exemple minimal pour convertir un fichier en 5 lignes :

```javascript
const { convertDwgToDxf } = require('dwg2dxf');

(async () => {
    const result = await convertDwgToDxf('./plan.dwg', './plan.dxf');
    console.log(result.success ? "Conversion réussie !" : "Erreur :", result.error);
})();
```

## Utilisation avancée

Pour une gestion complète en environnement asynchrone (ex: API backend) :

```javascript
const { convertDwgToDxf, checkWasm } = require('dwg2dxf');

async function processFile(inputPath, outputPath) {
    // 1. Vérifier la disponibilité du moteur
    const isReady = await checkWasm();
    if (!isReady) throw new Error("Moteur de conversion indisponible.");

    // 2. Lancer la conversion avec timeout (ex: 15 secondes)
    const result = await convertDwgToDxf(inputPath, outputPath, { timeout: 15000 });

    if (!result.success) {
        console.error(`Échec de conversion : ${result.error}`);
        return;
    }

    console.log(`✅ DXF généré avec succès en ${result.duration}ms`);
    console.log(`📁 Taille du fichier de sortie : ${(result.fileSize / 1024).toFixed(2)} KB`);
}

processFile('./data/input_R14.dwg', './data/output_2000.dxf');
```

## API Reference

### `convertDwgToDxf(inputPath, outputPath, [options])`

Fonction asynchrone principale de conversion.

- `inputPath` *(string)*: Chemin absolu ou relatif vers le fichier `.dwg` d'entrée.
- `outputPath` *(string)*: Chemin de destination pour le fichier `.dxf`.
- `options` *(Object)*:
  - `timeout` *(number)*: Temps maximal alloué à la conversion en millisecondes. Défaut: `30000` (30s).

**Retourne une `Promise<Object>` :**
```javascript
{
  success: boolean,       // true si la conversion a réussi
  outputPath: string,     // Le chemin du fichier généré (ou null si erreur)
  duration: number,       // Temps d'exécution en ms
  fileSize: number,       // Taille en bytes du DXF généré
  error: string | null    // Message d'erreur détaillé (si success === false)
}
```

### `checkWasm()`

- **Retourne:** `Promise<boolean>`
Charge le module WebAssembly en mémoire. Renvoie `true` si le moteur est prêt, `false` sinon.

## Versions DWG supportées

Le moteur LibreDWG sous-jacent est capable de lire une vaste gamme de versions DWG historiques :

| Version AutoCAD | Version Interne | Support de lecture |
|-----------------|-----------------|-------------------|
| AutoCAD Release 12 | R12 (AC1009) | ✅ Oui |
| AutoCAD Release 13 | R13 (AC1012) | ✅ Oui |
| AutoCAD Release 14 | R14 (AC1014) | ✅ Oui |
| AutoCAD 2000    | 2000 (AC1015)   | ✅ Oui |
| AutoCAD 2004    | 2004 (AC1018)   | ✅ Oui |
| AutoCAD 2007    | 2007 (AC1021)   | ✅ Oui |
| AutoCAD 2010    | 2010 (AC1024)   | ✅ Oui |
| AutoCAD 2013    | 2013 (AC1027)   | ✅ Oui |
| AutoCAD 2018+   | 2018 (AC1032)   | ✅ Oui |

## Contribuer

Pour re-compiler le module Wasm depuis les sources C de LibreDWG :

1. Assurez-vous d'avoir **Emscripten** (`emcc`) installé et dans votre `PATH`.
2. Sous Linux / macOS, lancez :
   ```bash
   npm run build
   ```
3. **Sous Windows :** LibreDWG utilise `autotools` qui ne sont pas natifs à PowerShell. Utilisez Git Bash, MSYS2 ou WSL, puis exécutez le script bash `./scripts/build-wasm.sh`.

## License

MIT © JosephESSEY
Le moteur embarqué LibreDWG est sous licence GPLv3.
