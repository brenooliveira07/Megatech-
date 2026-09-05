DROP TRIGGER IF EXISTS force_sale_total_zero_trg ON public.sales;
CREATE TRIGGER force_sale_total_zero_trg
BEFORE INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.force_sale_total_zero();

UPDATE public.sales s
SET total = COALESCE((SELECT SUM(si.subtotal) FROM public.sale_items si WHERE si.sale_id = s.id), 0);