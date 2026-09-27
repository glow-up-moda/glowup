-- Acceso al panel solo con email y contraseña (CLAUDE.md §7).
--
-- El segundo factor se saca a pedido de la dueña: pedir un código de la app del
-- celular en cada ingreso era demasiada fricción para el día a día. La
-- contraseña pasa a ser la única llave del panel.
--
-- La barrera real sigue siendo la misma: is_admin() exige estar en admin_users,
-- así que una clienta con cuenta sigue sin ver catálogo, pedidos ni
-- configuración. Lo único que se deja de exigir es el aal2 del JWT.
--
-- La política "Users read their own admin row" queda como está: ahora es
-- redundante para las administradoras, y a cualquier otra persona logueada le
-- devuelve cero filas igual que antes.

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users a where a.user_id = auth.uid())
$$;
