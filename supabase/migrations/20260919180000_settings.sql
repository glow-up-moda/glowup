-- Guardar la configuración desde el panel (§7).
--
-- `settings.value` es jsonb not null y un valor sin configurar es el null de
-- JSON. PostgREST, en cambio, convierte un null del cuerpo en NULL de SQL, que
-- la columna rechaza: por eso el panel escribe con esta función y no con un
-- upsert. Además, acá se decide qué claves existen: las nuevas llegan por
-- migración, no desde la pantalla.

create function public.set_settings(p_values jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_unknown text[];
  v_saved integer;
begin
  if p_values is null or jsonb_typeof(p_values) <> 'object' then
    raise exception using message = 'invalid_payload',
      detail = jsonb_build_object('reason', 'not_an_object')::text;
  end if;

  select array_agg(k)
  into v_unknown
  from jsonb_object_keys(p_values) k
  where not exists (select 1 from public.settings s where s.key = k);

  if v_unknown is not null then
    raise exception using message = 'invalid_setting',
      detail = jsonb_build_object('keys', to_jsonb(v_unknown))::text;
  end if;

  update public.settings s
  set value = p_values -> s.key
  where p_values ? s.key;

  get diagnostics v_saved = row_count;
  return v_saved;
end;
$$;

revoke all on function public.set_settings(jsonb) from public, anon;
grant execute on function public.set_settings(jsonb) to authenticated, service_role;
