#include <dwg.h>
#include <stdio.h>
#include <string.h>

// A wrapper to avoid manipulating complex structures in Javascript.
// Returns 0 on success, error code otherwise.
int convert_dwg_to_dxf(const char* in_file, const char* out_file) {
    Dwg_Data dwg;
    memset(&dwg, 0, sizeof(Dwg_Data));

    // Read DWG
    int error = dwg_read_file(in_file, &dwg);
    if (error >= DWG_ERR_CRITICAL) {
        return error;
    }

    // Prepare for DXF writing
    Bit_Chain dat = { 0 };
    dat.version = dwg.header.version;
    dat.from_version = dwg.header.from_version;
    dat.fh = fopen(out_file, "wb");
    if (!dat.fh) {
        dwg_free(&dwg);
        return -1; // File IO error
    }

    // Write DXF
    error = dwg_write_dxf(&dat, &dwg);
    
    fclose(dat.fh);
    dwg_free(&dwg);

    return error >= DWG_ERR_CRITICAL ? error : 0;
}
