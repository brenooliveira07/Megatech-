DROP POLICY "si_insert" ON public.sale_items;

CREATE POLICY "si_insert"
ON public.sale_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sales s
    WHERE s.id = sale_id
      AND s.user_id = auth.uid()
  )
);

DROP POLICY "sm_insert" ON public.stock_movements;

CREATE POLICY "sm_insert"
ON public.stock_movements
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

REVOKE EXECUTE ON FUNCTION public.handle_new_user()
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.touch_updated_at()
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.process_sale_item()
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)
FROM PUBLIC, anon;