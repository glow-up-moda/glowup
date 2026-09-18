-- Datos de prueba para el proyecto de desarrollo (CLAUDE.md §16, fase 1).
-- Se aplican aparte con `supabase db push --include-seed` y nunca llegan a
-- producción. Todo es inventado: el repo es público.
-- Se puede correr varias veces: lo que ya existe no se toca.

-- Categorías ----------------------------------------------------------------

insert into public.categories (name, slug, sort_order) values
  ('Ropa interior', 'ropa-interior', 1),
  ('Accesorios', 'accesorios', 2)
on conflict (slug) do nothing;

insert into public.categories (parent_id, name, slug, sort_order)
select c.id, x.name, x.slug, x.sort_order
from (values
  ('ropa-interior', 'Corpiños', 'corpinos', 1),
  ('ropa-interior', 'Bombachas', 'bombachas', 2),
  ('ropa-interior', 'Conjuntos', 'conjuntos', 3),
  ('ropa-interior', 'Bodies', 'bodies', 4),
  ('accesorios', 'Gorras', 'gorras', 1),
  ('accesorios', 'Anteojos de sol', 'anteojos-de-sol', 2),
  ('accesorios', 'Toallones', 'toallones', 3)
) as x (parent_slug, name, slug, sort_order)
join public.categories c on c.slug = x.parent_slug
on conflict (slug) do nothing;

-- Productos -----------------------------------------------------------------
-- El Corpiño deportivo Ritmo queda sin publicar a propósito: sirve para probar
-- que la tienda no lo ve.

insert into public.products (
  category_id, name, slug, description, materials_care,
  cost_cents, price_cents, compare_at_price_cents, is_published
)
select c.id, x.name, x.slug, x.description, x.materials_care,
       x.cost_cents, x.price_cents, x.compare_at_price_cents, x.is_published
from (values
  ('corpinos', 'Corpiño Luna', 'corpino-luna',
    'Corpiño sin aro con copa soft y breteles regulables.',
    'Microfibra 85%, elastano 15%. Lavar a mano con agua fría y secar a la sombra.',
    1480000, 3290000, null::integer, true),
  ('corpinos', 'Corpiño Brisa', 'corpino-brisa',
    'Corpiño con encaje en el escote y cierre de tres posiciones.',
    'Encaje de poliamida y forro de algodón. Lavar a mano con agua fría.',
    1350000, 2990000, null, true),
  ('corpinos', 'Corpiño deportivo Ritmo', 'corpino-ritmo',
    'Corpiño deportivo de sostén medio, sin costuras.',
    'Poliamida 90%, elastano 10%. Lavar a mano con agua fría.',
    1200000, 2750000, null, false),
  ('bombachas', 'Bombacha de algodón Clásica', 'bombacha-algodon-clasica',
    'Bombacha de tiro medio en algodón peinado, con elástico forrado.',
    'Algodón 95%, elastano 5%. Lavable en lavarropas con agua fría.',
    420000, 990000, null, true),
  ('bombachas', 'Bombacha de encaje Sol', 'bombacha-encaje-sol',
    'Bombacha de encaje con frente liso y terminaciones sin elástico a la vista.',
    'Encaje de poliamida y elastano. Lavar a mano con agua fría.',
    560000, 1290000, 1590000, true),
  ('conjuntos', 'Conjunto Aurora', 'conjunto-aurora',
    'Corpiño triangular y bombacha de tiro medio en tul bordado.',
    'Tul de poliamida con bordado. Lavar a mano con agua fría.',
    2100000, 4690000, null, true),
  ('bodies', 'Body Nube', 'body-nube',
    'Body de modal con escote redondo y broches en la entrepierna.',
    'Modal 92%, elastano 8%. Lavar a mano o en ciclo delicado.',
    1730000, 3850000, null, true),
  ('gorras', 'Gorra de lino', 'gorra-lino',
    'Gorra de visera curva con cierre regulable.',
    'Lino 55%, algodón 45%. Lavar a mano.',
    790000, 1890000, null, true),
  ('anteojos-de-sol', 'Anteojos de sol Costa', 'anteojos-costa',
    'Anteojos de marco redondo con filtro UV400.',
    'Marco de acetato. Limpiar con un paño de microfibra.',
    980000, 2490000, null, true),
  ('toallones', 'Toallón de playa Rayado', 'toallon-playa-rayado',
    'Toallón de playa de 90 × 170 cm con rayas tejidas.',
    'Algodón 100%. Lavable en lavarropas.',
    1390000, 3190000, null, true)
) as x (category_slug, name, slug, description, materials_care,
        cost_cents, price_cents, compare_at_price_cents, is_published)
join public.categories c on c.slug = x.category_slug
on conflict (slug) do nothing;

-- Variantes -----------------------------------------------------------------
-- Stock variado a propósito: hay talles agotados (0), últimas unidades (1 y 2)
-- y suficiente de los componentes de los kits.

insert into public.product_variants (product_id, color, size, sku, stock_on_hand)
select p.id, x.color, x.size, x.sku, x.stock
from (values
  ('corpino-luna', 'Negro', '85', 'LUNA-NEG-85', 4),
  ('corpino-luna', 'Negro', '90', 'LUNA-NEG-90', 6),
  ('corpino-luna', 'Negro', '95', 'LUNA-NEG-95', 3),
  ('corpino-luna', 'Negro', '100', 'LUNA-NEG-100', 0),
  ('corpino-luna', 'Natural', '85', 'LUNA-NAT-85', 2),
  ('corpino-luna', 'Natural', '90', 'LUNA-NAT-90', 5),
  ('corpino-luna', 'Natural', '95', 'LUNA-NAT-95', 5),
  ('corpino-luna', 'Natural', '100', 'LUNA-NAT-100', 1),
  ('corpino-brisa', 'Blanco', '85', 'BRISA-BLA-85', 3),
  ('corpino-brisa', 'Blanco', '90', 'BRISA-BLA-90', 4),
  ('corpino-brisa', 'Blanco', '95', 'BRISA-BLA-95', 2),
  ('corpino-brisa', 'Blanco', '100', 'BRISA-BLA-100', 1),
  ('corpino-brisa', 'Rosa viejo', '85', 'BRISA-ROS-85', 0),
  ('corpino-brisa', 'Rosa viejo', '90', 'BRISA-ROS-90', 3),
  ('corpino-brisa', 'Rosa viejo', '95', 'BRISA-ROS-95', 4),
  ('corpino-brisa', 'Rosa viejo', '100', 'BRISA-ROS-100', 2),
  ('corpino-ritmo', 'Negro', 'S', 'RITMO-NEG-S', 5),
  ('corpino-ritmo', 'Negro', 'M', 'RITMO-NEG-M', 5),
  ('corpino-ritmo', 'Negro', 'L', 'RITMO-NEG-L', 5),
  ('bombacha-algodon-clasica', 'Negro', 'S', 'CLASICA-NEG-S', 8),
  ('bombacha-algodon-clasica', 'Negro', 'M', 'CLASICA-NEG-M', 10),
  ('bombacha-algodon-clasica', 'Negro', 'L', 'CLASICA-NEG-L', 7),
  ('bombacha-algodon-clasica', 'Negro', 'XL', 'CLASICA-NEG-XL', 4),
  ('bombacha-algodon-clasica', 'Blanco', 'S', 'CLASICA-BLA-S', 6),
  ('bombacha-algodon-clasica', 'Blanco', 'M', 'CLASICA-BLA-M', 6),
  ('bombacha-algodon-clasica', 'Blanco', 'L', 'CLASICA-BLA-L', 5),
  ('bombacha-algodon-clasica', 'Blanco', 'XL', 'CLASICA-BLA-XL', 3),
  ('bombacha-algodon-clasica', 'Natural', 'S', 'CLASICA-NAT-S', 4),
  ('bombacha-algodon-clasica', 'Natural', 'M', 'CLASICA-NAT-M', 5),
  ('bombacha-algodon-clasica', 'Natural', 'L', 'CLASICA-NAT-L', 5),
  ('bombacha-algodon-clasica', 'Natural', 'XL', 'CLASICA-NAT-XL', 2),
  ('bombacha-encaje-sol', 'Negro', 'S', 'SOL-NEG-S', 3),
  ('bombacha-encaje-sol', 'Negro', 'M', 'SOL-NEG-M', 5),
  ('bombacha-encaje-sol', 'Negro', 'L', 'SOL-NEG-L', 4),
  ('bombacha-encaje-sol', 'Negro', 'XL', 'SOL-NEG-XL', 1),
  ('bombacha-encaje-sol', 'Rosa viejo', 'S', 'SOL-ROS-S', 2),
  ('bombacha-encaje-sol', 'Rosa viejo', 'M', 'SOL-ROS-M', 4),
  ('bombacha-encaje-sol', 'Rosa viejo', 'L', 'SOL-ROS-L', 3),
  ('bombacha-encaje-sol', 'Rosa viejo', 'XL', 'SOL-ROS-XL', 0),
  ('conjunto-aurora', 'Negro', 'S', 'AURORA-NEG-S', 2),
  ('conjunto-aurora', 'Negro', 'M', 'AURORA-NEG-M', 3),
  ('conjunto-aurora', 'Negro', 'L', 'AURORA-NEG-L', 3),
  ('conjunto-aurora', 'Negro', 'XL', 'AURORA-NEG-XL', 1),
  ('conjunto-aurora', 'Natural', 'S', 'AURORA-NAT-S', 1),
  ('conjunto-aurora', 'Natural', 'M', 'AURORA-NAT-M', 2),
  ('conjunto-aurora', 'Natural', 'L', 'AURORA-NAT-L', 2),
  ('conjunto-aurora', 'Natural', 'XL', 'AURORA-NAT-XL', 0),
  ('body-nube', 'Negro', 'S', 'NUBE-NEG-S', 3),
  ('body-nube', 'Negro', 'M', 'NUBE-NEG-M', 4),
  ('body-nube', 'Negro', 'L', 'NUBE-NEG-L', 2),
  ('gorra-lino', 'Natural', 'Único', 'GORRA-NAT-U', 6),
  ('gorra-lino', 'Rosa viejo', 'Único', 'GORRA-ROS-U', 4),
  ('anteojos-costa', 'Negro', 'Único', 'COSTA-NEG-U', 5),
  ('toallon-playa-rayado', 'Natural', 'Único', 'RAYADO-NAT-U', 3)
) as x (product_slug, color, size, sku, stock)
join public.products p on p.slug = x.product_slug
on conflict (product_id, color, size) do nothing;

-- Kits ----------------------------------------------------------------------

insert into public.kits (name, slug, price_cents, compare_at_price_cents, is_published) values
  ('Kit playa', 'kit-playa', 6490000, 7570000, true),
  ('Kit básicos talle M', 'kit-basicos', 2690000, 2970000, true)
on conflict (slug) do nothing;

-- El Kit básicos lleva dos unidades de la misma variante: prueba el
-- floor(disponible / cantidad) de §9.7.
insert into public.kit_items (kit_id, variant_id, quantity)
select k.id, v.id, x.quantity
from (values
  ('kit-playa', 'GORRA-NAT-U', 1),
  ('kit-playa', 'COSTA-NEG-U', 1),
  ('kit-playa', 'RAYADO-NAT-U', 1),
  ('kit-basicos', 'CLASICA-NEG-M', 2),
  ('kit-basicos', 'CLASICA-BLA-M', 1)
) as x (kit_slug, sku, quantity)
join public.kits k on k.slug = x.kit_slug
join public.product_variants v on v.sku = x.sku
on conflict (kit_id, variant_id) do nothing;

-- Zonas de envío (provisorias, §17) -------------------------------------------

insert into public.shipping_zones (name, provinces, postal_codes, price_cents, eta_text, same_day) values
  ('Paraná', '{"Entre Ríos"}', '{3100}', 350000, 'En el día', true),
  ('Oro Verde', '{"Entre Ríos"}', '{3101}', 450000, 'En el día', true),
  ('Entre Ríos', '{"Entre Ríos"}', '{}', 650000, 'De 2 a 4 días hábiles', false),
  ('Resto del país',
    '{"Buenos Aires","Catamarca","Chaco","Chubut","Ciudad Autónoma de Buenos Aires","Córdoba","Corrientes","Formosa","Jujuy","La Pampa","La Rioja","Mendoza","Misiones","Neuquén","Río Negro","Salta","San Juan","San Luis","Santa Cruz","Santa Fe","Santiago del Estero","Tierra del Fuego","Tucumán"}',
    '{}', 950000, 'De 3 a 7 días hábiles', false)
on conflict (name) do nothing;

-- Cupones de prueba ---------------------------------------------------------

insert into public.coupons (code, type, value, min_subtotal_cents, ends_at, max_uses) values
  ('BIENVENIDA15', 'percent', 15, 2000000, null, 100),
  ('REGALO5000', 'fixed', 500000, 3000000, '2027-12-31 23:59:59-03', null)
on conflict (code) do nothing;

-- Reseñas: dos aprobadas y una pendiente, que la tienda no tiene que ver ------

insert into public.reviews (product_id, rating, text, name, status)
select p.id, x.rating, x.text, x.name, x.status::public.review_status
from (values
  ('corpino-luna', 5, 'Súper cómodo, lo uso todos los días.', 'Caro', 'approved'),
  ('bombacha-algodon-clasica', 4, 'Muy suave y el talle es justo.', 'Lu', 'approved'),
  ('body-nube', 3, 'Lindo, pero tardé en elegir el talle.', 'Meli', 'pending')
) as x (product_slug, rating, text, name, status)
join public.products p on p.slug = x.product_slug
where not exists (
  select 1 from public.reviews r where r.product_id = p.id and r.name = x.name
);
