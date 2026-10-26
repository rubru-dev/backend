INSERT INTO checklist_sipils (
  proyek_id, task_id, termin_id, item_jenis, nama_pekerjaan, area_pekerjaan, urutan, created_at, updated_at
)
SELECT
  termin.proyek_berjalan_id,
  task.id,
  termin.id,
  task.checklist_jenis,
  COALESCE(task.nama_pekerjaan, 'Pekerjaan tanpa nama'),
  COALESCE(termin.nama, 'Termin ' || termin.urutan),
  ROW_NUMBER() OVER (PARTITION BY termin.proyek_berjalan_id ORDER BY termin.urutan, task.id) - 1,
  now(),
  now()
FROM proyek_berjalan_tasks task
JOIN proyek_berjalan_termins termin ON termin.id = task.termin_id
ON CONFLICT (proyek_id, task_id) DO UPDATE SET
  termin_id = EXCLUDED.termin_id,
  item_jenis = EXCLUDED.item_jenis,
  nama_pekerjaan = EXCLUDED.nama_pekerjaan,
  area_pekerjaan = EXCLUDED.area_pekerjaan,
  urutan = EXCLUDED.urutan;

INSERT INTO checklist_interiors (
  proyek_id, task_id, termin_id, item_jenis, nama_pekerjaan, area_pekerjaan, urutan, created_at, updated_at
)
SELECT
  termin.proyek_interior_id,
  task.id,
  termin.id,
  task.checklist_jenis,
  COALESCE(task.nama_pekerjaan, 'Pekerjaan tanpa nama'),
  COALESCE(termin.nama, 'Termin ' || termin.urutan),
  ROW_NUMBER() OVER (PARTITION BY termin.proyek_interior_id ORDER BY termin.urutan, task.id) - 1,
  now(),
  now()
FROM proyek_interior_tasks task
JOIN proyek_interior_termins termin ON termin.id = task.termin_id
ON CONFLICT (proyek_id, task_id) DO UPDATE SET
  termin_id = EXCLUDED.termin_id,
  item_jenis = EXCLUDED.item_jenis,
  nama_pekerjaan = EXCLUDED.nama_pekerjaan,
  area_pekerjaan = EXCLUDED.area_pekerjaan,
  urutan = EXCLUDED.urutan;
