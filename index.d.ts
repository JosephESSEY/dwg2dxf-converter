export interface ConversionOptions {
    /**
     * Timeout in milliseconds. Default: 30000 (30s)
     */
    timeout?: number;
}

export interface ConversionResult {
    /**
     * True if the conversion succeeded, false otherwise.
     */
    success: boolean;
    /**
     * The path to the generated DXF file, or null if an error occurred.
     */
    outputPath: string | null;
    /**
     * Time taken to perform the conversion in milliseconds.
     */
    duration: number;
    /**
     * The size of the generated DXF file in bytes.
     */
    fileSize: number;
    /**
     * Detailed error message if the conversion failed, otherwise null.
     */
    error: string | null;
}

/**
 * Converts a DWG file to DXF format using the standalone WebAssembly LibreDWG engine.
 * 
 * @param inputPath Absolute or relative path to the input .dwg file.
 * @param outputPath Destination path for the generated .dxf file.
 * @param options Options for the conversion.
 */
export function convertDwgToDxf(
    inputPath: string,
    outputPath: string,
    options?: ConversionOptions
): Promise<ConversionResult>;

/**
 * Verifies if the WebAssembly module loads correctly in the environment.
 * Useful to call at application startup.
 */
export function checkWasm(): Promise<boolean>;

/**
 * The current version of the dwg2dxf-converter package.
 */
export const VERSION: string;
