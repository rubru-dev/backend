INSERT INTO "permissions" ("name", "module", "label", "created_at", "updated_at")
VALUES
  ('penawaran.berita_acara', 'penawaran', 'Sub-menu: Berita Acara', now(), now()),
  ('pic.pb_projek', 'pic', 'Sub-menu: PB Projek PIC', now(), now()),
  ('finance.pb_projek', 'finance', 'Sub-menu: PB Projek Finance', now(), now())
ON CONFLICT ("name") DO UPDATE SET
  "module" = EXCLUDED."module",
  "label" = EXCLUDED."label",
  "updated_at" = now();

-- Role yang sebelumnya dapat membuka menu Penawaran tetap dapat membuka BA.
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT existing_access."role_id", ba_permission."id"
FROM "role_permissions" existing_access
JOIN "permissions" menu_permission
  ON menu_permission."id" = existing_access."permission_id"
JOIN "permissions" ba_permission
  ON ba_permission."name" = 'penawaran.berita_acara'
WHERE menu_permission."name" = 'penawaran.view'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
