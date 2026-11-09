-- Lengkapi lead Administrasi Projek lama dari proyek operasional yang sudah tertaut.
UPDATE adm_finance_projects AS adm
SET lead_id = proyek.lead_id
FROM proyek_berjalans AS proyek
WHERE adm.lead_id IS NULL
  AND adm.proyek_berjalan_id = proyek.id
  AND proyek.lead_id IS NOT NULL;

UPDATE adm_finance_projects AS adm
SET lead_id = proyek.lead_id
FROM proyek_interiors AS proyek
WHERE adm.lead_id IS NULL
  AND adm.proyek_interior_id = proyek.id
  AND proyek.lead_id IS NOT NULL;
