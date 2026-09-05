-- Revoke everything from PUBLIC and anon on all SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_manager(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.touch_last_access() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_user_status(uuid, user_status) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_profile(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC, anon;

-- Trigger-only functions: not callable by any API role
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_sale_item_price() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.force_sale_total_zero() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_sale_item() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_sale_total() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Grant only the minimum required to signed-in users
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_last_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_status(uuid, user_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;