DROP POLICY IF EXISTS "profiles_select_all_auth" ON public.profiles;

CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "user_roles_select_auth" ON public.user_roles;

CREATE POLICY "user_roles_select_own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "sales_select" ON public.sales;

CREATE POLICY "sales_select_own"
ON public.sales
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "si_select" ON public.sale_items;

CREATE POLICY "si_select_own"
ON public.sale_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sales s
    WHERE s.id = sale_items.sale_id
      AND (
        s.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
      )
  )
);

DROP POLICY IF EXISTS "sm_select" ON public.stock_movements;

CREATE POLICY "sm_select_admin"
ON public.stock_movements
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "sm_insert" ON public.stock_movements;

CREATE POLICY "sm_insert_admin"
ON public.stock_movements
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

CREATE OR REPLACE FUNCTION public.enforce_sale_item_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  authoritative_price numeric(10,2);
BEGIN
  SELECT price
  INTO authoritative_price
  FROM public.products
  WHERE id = NEW.product_id;

  IF authoritative_price IS NULL THEN
    RAISE EXCEPTION 'Produto inexistente';
  END IF;

  NEW.unit_price := authoritative_price;
  NEW.subtotal := authoritative_price * NEW.quantity;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_sale_item_price()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sale_item_enforce_price
ON public.sale_items;

CREATE TRIGGER sale_item_enforce_price
BEFORE INSERT ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION public.enforce_sale_item_price();

CREATE OR REPLACE FUNCTION public.recompute_sale_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_sale uuid;
BEGIN
  target_sale := COALESCE(NEW.sale_id, OLD.sale_id);

  UPDATE public.sales
  SET total = COALESCE(
    (
      SELECT SUM(subtotal)
      FROM public.sale_items
      WHERE sale_id = target_sale
    ),
    0
  )
  WHERE id = target_sale;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recompute_sale_total()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sale_item_recompute_total
ON public.sale_items;

CREATE TRIGGER sale_item_recompute_total
AFTER INSERT OR UPDATE OR DELETE
ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION public.recompute_sale_total();