
CREATE OR REPLACE FUNCTION public.force_sale_total_zero()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.total := 0;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS force_sale_total_zero_trg ON public.sales;
CREATE TRIGGER force_sale_total_zero_trg
BEFORE INSERT OR UPDATE OF total ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.force_sale_total_zero();
