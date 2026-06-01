#include <dwg.h>
#include <bits.h>
#include <out_dxf.h>
#include <stdio.h>
#include <string.h>

// A wrapper to avoid manipulating complex structures in Javascript.
// Returns 0 on success, error code otherwise.
int convert_dwg_to_dxf(const char* in_file, const char* out_file) {
    Dwg_Data dwg;
    memset(&dwg, 0, sizeof(Dwg_Data));

    // Read DWG
    int read_error = dwg_read_file(in_file, &dwg);
    if (read_error >= DWG_ERR_CRITICAL) {
        return read_error;
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
    int write_error = dwg_write_dxf(&dat, &dwg);
    
    fclose(dat.fh);
    dwg_free(&dwg);

    if (write_error >= DWG_ERR_CRITICAL) {
        return write_error;
    }

    // Return the read error if it had warnings, otherwise the write error (if any), otherwise 0.
    return read_error != 0 ? read_error : (write_error >= 0 ? write_error : 0);
}
