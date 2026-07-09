DROP VIEW public.v_host_performance;

CREATE OR REPLACE VIEW public.v_host_performance AS
 SELECT h.id AS host_id,
    h.full_name AS host_name,
    r.month,
    r.year,
    count(r.id) AS total_reports,
    count(
        CASE
            WHEN r.status::text = 'APPROVED'::text THEN 1
            ELSE NULL::integer
        END) AS approved_reports,
    COALESCE(sum(
        CASE
            WHEN r.status::text = 'APPROVED'::text THEN r.reported_gmv
            ELSE 0::numeric
        END), 0::numeric) AS total_gmv,
    COALESCE(sum(
        CASE
            WHEN r.status::text = 'APPROVED'::text THEN r.reported_pesanan_sku
            ELSE 0::numeric
        END), 0::numeric) AS total_pesanan_sku,
    COALESCE(sum(
        CASE
            WHEN r.status::text = 'APPROVED'::text THEN r.live_duration_minutes
            ELSE 0
        END), 0::bigint) AS total_duration_minutes,
    COALESCE(avg(
        CASE
            WHEN r.status::text = 'APPROVED'::text THEN r.reported_gmv
            ELSE NULL::numeric
        END), 0::numeric) AS avg_gmv_per_session,
        CASE
            WHEN sum(
            CASE
                WHEN r.status::text = 'APPROVED'::text THEN r.live_duration_minutes
                ELSE 0
            END) > 0 THEN COALESCE(sum(
            CASE
                WHEN r.status::text = 'APPROVED'::text THEN r.reported_gmv
                ELSE 0::numeric
            END), 0::numeric) / (sum(
            CASE
                WHEN r.status::text = 'APPROVED'::text THEN r.live_duration_minutes
                ELSE 0
            END)::numeric / 60.0)
            ELSE 0::numeric
        END AS gmv_per_hour
   FROM hosts h
     LEFT JOIN reports r ON h.id = r.host_id
  WHERE h.is_active = true
  GROUP BY h.id, h.full_name, r.month, r.year;
