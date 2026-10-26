-- Destructive removal of Golden and Filter Air data.
-- This migration intentionally deletes all records belonging to both products.

BEGIN;

-- Remove saved offers first because they are independent of the lead FK.
DELETE FROM penawaran_offers
WHERE type IN ('golden', 'filter-air');

-- Remove Golden-specific dependent records.
DELETE FROM golden_kanban_admin_labels;
DELETE FROM golden_kanban_admin_comments;
DELETE FROM golden_kanban_admin_cards;
DELETE FROM golden_kanban_admin_columns;
DELETE FROM golden_kanban_sales_labels;
DELETE FROM golden_kanban_sales_comments;
DELETE FROM golden_kanban_sales_cards;
DELETE FROM golden_kanban_sales_columns;
DELETE FROM golden_ad_content_metrics;
DELETE FROM golden_whatsapp_chat_metrics;
DELETE FROM golden_ad_monthly_targets;
DELETE FROM golden_meta_ads_campaigns;

-- Remove product-linked rows from tables that reference leads.
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'lead_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name <> 'leads'
  LOOP
    EXECUTE format(
      'DELETE FROM public.%I WHERE lead_id IN (SELECT id FROM public.leads WHERE modul IN (''golden'', ''filter-air''))',
      table_name
    );
  END LOOP;
END $$;

DELETE FROM leads WHERE modul IN ('golden', 'filter-air');

-- Remove product-specific invoice metadata after the product invoices are gone.
ALTER TABLE invoices DROP COLUMN IF EXISTS jenis_filter_air;

COMMIT;
