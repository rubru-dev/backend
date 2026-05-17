<?php
function kendaraan_image_url(?string $filename): ?string
{
    if (!$filename) {
        return null;
    }

    return '../backend/uploads/' . rawurlencode($filename);
}
?>
