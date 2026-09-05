
-- PRODUCTS
DROP POLICY IF EXISTS "prod_admin_write" ON public.products;
CREATE POLICY "prod_write_stock_roles" ON public.products FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'gerente') OR
  public.has_role(auth.uid(),'estoquista')
) WITH CHECK (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'gerente') OR
  public.has_role(auth.uid(),'estoquista')
);

-- CATEGORIES
DROP POLICY IF EXISTS "cat_admin_write" ON public.categories;
CREATE POLICY "cat_manager_write" ON public.categories FOR ALL TO authenticated
USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

-- SALES: allow admin/gerente/funcionario to insert; keep read policies as-is.
-- (Drop known common names if they exist and (re)create insert policy.)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sales' AND policyname='sales_insert_all_auth') THEN
    DROP POLICY "sales_insert_all_auth" ON public.sales;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sales' AND policyname='sales_insert_sellers') THEN
    DROP POLICY "sales_insert_sellers" ON public.sales;
  END IF;
END $$;
CREATE POLICY "sales_insert_sellers" ON public.sales FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'gerente') OR
  public.has_role(auth.uid(),'funcionario')
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sale_items' AND policyname='sale_items_insert_all_auth') THEN
    DROP POLICY "sale_items_insert_all_auth" ON public.sale_items;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sale_items' AND policyname='sale_items_insert_sellers') THEN
    DROP POLICY "sale_items_insert_sellers" ON public.sale_items;
  END IF;
END $$;
CREATE POLICY "sale_items_insert_sellers" ON public.sale_items FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'gerente') OR
  public.has_role(auth.uid(),'funcionario')
);

-- STOCK MOVEMENTS: allow admin/gerente/estoquista
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stock_movements' AND policyname='stock_movements_insert_all_auth') THEN
    DROP POLICY "stock_movements_insert_all_auth" ON public.stock_movements;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stock_movements' AND policyname='stock_movements_insert_stock_roles') THEN
    DROP POLICY "stock_movements_insert_stock_roles" ON public.stock_movements;
  END IF;
END $$;
CREATE POLICY "stock_movements_insert_stock_roles" ON public.stock_movements FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'gerente') OR
  public.has_role(auth.uid(),'estoquista')
);
