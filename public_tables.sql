--
-- PostgreSQL database dump
--

\restrict fXV2ybaqehZjMP94EsOlvpJmKfpDdANK5TI37BCHRZkh8bDRJq2xQQJtU6BMql2

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: _cbp_users_duplicate_set_gi(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._cbp_users_duplicate_set_gi() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.gindex is null then
    new.gindex := nextval('eonx_user_gi_seq');
  end if;
  return new;
end $$;


ALTER FUNCTION public._cbp_users_duplicate_set_gi() OWNER TO postgres;

--
-- Name: _cbp_users_set_gi(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._cbp_users_set_gi() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.gindex is null then
    new.gindex := nextval('eonx_user_gi_seq');
  end if;
  return new;
end $$;


ALTER FUNCTION public._cbp_users_set_gi() OWNER TO postgres;

--
-- Name: bump_ref_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.bump_ref_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  update public.cbp_users
  set referred_count = referred_count + 1
  where wallet_address = new.referrer_address;
  return new;
end; $$;


ALTER FUNCTION public.bump_ref_count() OWNER TO postgres;

--
-- Name: fn_on_user_has_bought_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_on_user_has_bought_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  -- only react when the flag actually changes
  if tg_op = 'UPDATE' and coalesce(new.has_bought,false) = coalesce(old.has_bought,false) then
    return new;
  end if;

  -- simplest: recompute everything (fine at your current scale)
  perform public.fn_refresh_referral_counts();
  return new;
end;
$$;


ALTER FUNCTION public.fn_on_user_has_bought_change() OWNER TO postgres;

--
-- Name: fn_referral_counts_sync(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_referral_counts_sync() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if (TG_OP = 'INSERT') then
    insert into public.referral_counts (referrer_address, referred_count)
    values (new.referrer_address, 1)
    on conflict (referrer_address)
    do update set referred_count = public.referral_counts.referred_count + 1;
    return new;

  elsif (TG_OP = 'DELETE') then
    update public.referral_counts
      set referred_count = greatest(referred_count - 1, 0)
    where referrer_address = old.referrer_address;
    return old;

  elsif (TG_OP = 'UPDATE') then
    if new.referrer_address is distinct from old.referrer_address then
      update public.referral_counts
        set referred_count = greatest(referred_count - 1, 0)
      where referrer_address = old.referrer_address;

      insert into public.referral_counts (referrer_address, referred_count)
      values (new.referrer_address, 1)
      on conflict (referrer_address) do update
        set referred_count = public.referral_counts.referred_count + 1;
    end if;
    return new;
  end if;

  return null;
end;
$$;


ALTER FUNCTION public.fn_referral_counts_sync() OWNER TO postgres;

--
-- Name: fn_refresh_referral_counts(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_refresh_referral_counts() RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
with recursive paths(ancestor, descendant, level, path) as (
  select lower(r.referrer_address) as ancestor,
         lower(r.referee_address)  as descendant,
         1 as level,
         array[lower(r.referrer_address), lower(r.referee_address)]::text[] as path
  from public.cbp_referrals r
  union all
  select p.ancestor,
         lower(r.referee_address),
         p.level + 1,
         p.path || lower(r.referee_address)
  from paths p
  join public.cbp_referrals r
    on lower(r.referrer_address) = p.descendant
  where p.level < 20
    and not lower(r.referee_address) = any(p.path)  -- prevent cycles
),
agg as (
  select
    p.ancestor as referrer_address,
    count(*) filter (where p.level = 1)                                        as direct_count,
    count(*) filter (where p.level >= 2)                                       as indirect_count,
    count(*) filter (where p.level = 1  and coalesce(u.has_bought,false))      as valid_direct_count,
    count(*) filter (where p.level = 1  and not coalesce(u.has_bought,false))  as invalid_direct_count,
    count(*) filter (where p.level >= 2 and coalesce(u.has_bought,false))      as valid_indirect_count,
    count(*) filter (where p.level >= 2 and not coalesce(u.has_bought,false))  as invalid_indirect_count,
    count(*)                                                                   as total_downline_count
  from paths p
  left join public.cbp_users u on lower(u.wallet_address) = p.descendant
  group by p.ancestor
)
insert into public.referral_counts as t (
  referrer_address,
  direct_count, indirect_count,
  valid_direct_count, invalid_direct_count,
  valid_indirect_count, invalid_indirect_count,
  total_downline_count
)
select
  referrer_address,
  direct_count, indirect_count,
  valid_direct_count, invalid_direct_count,
  valid_indirect_count, invalid_indirect_count,
  total_downline_count
from agg
on conflict (referrer_address) do update set
  direct_count           = excluded.direct_count,
  indirect_count         = excluded.indirect_count,
  valid_direct_count     = excluded.valid_direct_count,
  invalid_direct_count   = excluded.invalid_direct_count,
  valid_indirect_count   = excluded.valid_indirect_count,
  invalid_indirect_count = excluded.invalid_indirect_count,
  total_downline_count   = excluded.total_downline_count

/* If you want to also keep referred_count aligned with direct_count,
   uncomment the next UPDATE (otherwise we leave referred_count untouched):
-- update public.cbp_referral_counts t
-- set referred_count = direct_count
-- where referred_count is distinct from direct_count;
*/
$$;


ALTER FUNCTION public.fn_refresh_referral_counts() OWNER TO postgres;

--
-- Name: fn_set_ref_count(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_set_ref_count(p_referrer text, p_count integer) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  insert into public.referral_counts (referrer_address, referred_count)
  values (lower(p_referrer), p_count)
  on conflict (referrer_address) do update
    set referred_count = excluded.referred_count;
$$;


ALTER FUNCTION public.fn_set_ref_count(p_referrer text, p_count integer) OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end; $$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cbp_referrals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cbp_referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_address text NOT NULL,
    referee_address text NOT NULL,
    tx_hash text,
    source text DEFAULT 'ui'::text,
    block_number bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cbp_referrals_source_check CHECK ((source = ANY (ARRAY['events'::text, 'views'::text, 'ui'::text]))),
    CONSTRAINT no_self_referral CHECK ((lower(referrer_address) <> lower(referee_address)))
);


ALTER TABLE public.cbp_referrals OWNER TO postgres;

--
-- Name: cbp_user_claims; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cbp_user_claims (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    wallet_address text,
    tier bigint,
    amount bigint,
    "isPayoutProcessed" boolean,
    userclaimed boolean,
    batch_id bigint,
    proof text,
    tx_id text,
    "updatedAt" timestamp without time zone,
    "status_Active" boolean
);


ALTER TABLE public.cbp_user_claims OWNER TO postgres;

--
-- Name: cbp_user_claims_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.cbp_user_claims ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.cbp_user_claims_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cbp_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cbp_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_address text NOT NULL,
    invite_url text NOT NULL,
    referred_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ref_code text,
    has_bought boolean,
    gindex bigint,
    current_tier integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.cbp_users OWNER TO postgres;

--
-- Name: eonx_tiers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.eonx_tiers (
    id integer NOT NULL,
    tier_no integer NOT NULL,
    gvm_window bigint NOT NULL,
    cumulative_gvm bigint NOT NULL,
    pve_amount_usd bigint NOT NULL,
    direct_required integer DEFAULT 0 NOT NULL,
    valid_total_required bigint NOT NULL,
    notes text
);


ALTER TABLE public.eonx_tiers OWNER TO postgres;

--
-- Name: eonx_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.eonx_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.eonx_tiers_id_seq OWNER TO postgres;

--
-- Name: eonx_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.eonx_tiers_id_seq OWNED BY public.eonx_tiers.id;


--
-- Name: eonx_user_gi_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.eonx_user_gi_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.eonx_user_gi_seq OWNER TO postgres;

--
-- Name: referral_counts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referral_counts (
    referrer_address text NOT NULL,
    referred_count integer DEFAULT 0 NOT NULL,
    direct_count integer DEFAULT 0 NOT NULL,
    indirect_count integer DEFAULT 0 NOT NULL,
    valid_direct_count integer DEFAULT 0 NOT NULL,
    invalid_direct_count integer DEFAULT 0 NOT NULL,
    valid_indirect_count integer DEFAULT 0 NOT NULL,
    invalid_indirect_count integer DEFAULT 0 NOT NULL,
    total_downline_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.referral_counts OWNER TO postgres;

--
-- Name: scanner_state; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scanner_state (
    id integer NOT NULL,
    last_scanned_block bigint NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.scanner_state OWNER TO postgres;

--
-- Name: scanner_state_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.scanner_state_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scanner_state_id_seq OWNER TO postgres;

--
-- Name: scanner_state_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.scanner_state_id_seq OWNED BY public.scanner_state.id;


--
-- Name: tier_updates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tier_updates (
    id bigint NOT NULL,
    wallet_address text NOT NULL,
    current_tier integer NOT NULL,
    updated_tier integer NOT NULL,
    comment text,
    admin_email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tier_updates OWNER TO postgres;

--
-- Name: tier_updates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tier_updates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tier_updates_id_seq OWNER TO postgres;

--
-- Name: tier_updates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tier_updates_id_seq OWNED BY public.tier_updates.id;


--
-- Name: v_cbp_main_referrer_top2_valid; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_cbp_main_referrer_top2_valid AS
 WITH lvl1 AS (
         SELECT lower(r.referrer_address) AS main_norm,
            min(r.referrer_address) AS main_referrer,
            lower(r.referee_address) AS ref_norm,
            min(r.referee_address) AS referee_address
           FROM public.cbp_referrals r
          GROUP BY (lower(r.referrer_address)), (lower(r.referee_address))
        ), joined AS (
         SELECT l.main_referrer,
            l.referee_address,
            COALESCE(rc.valid_direct_count, 0) AS valid_direct,
            COALESCE(rc.valid_indirect_count, 0) AS valid_indirect,
            (COALESCE(rc.valid_direct_count, 0) + COALESCE(rc.valid_indirect_count, 0)) AS valid_total
           FROM (lvl1 l
             LEFT JOIN public.referral_counts rc ON ((lower(rc.referrer_address) = l.ref_norm)))
        ), ranked AS (
         SELECT joined.main_referrer,
            joined.referee_address,
            joined.valid_total,
            joined.valid_direct,
            joined.valid_indirect,
            row_number() OVER (PARTITION BY joined.main_referrer ORDER BY joined.valid_total DESC, joined.valid_direct DESC, joined.referee_address) AS rn
           FROM joined
        )
 SELECT main_referrer,
    max(
        CASE
            WHEN (rn = 1) THEN referee_address
            ELSE NULL::text
        END) AS top_referee_1,
    max(
        CASE
            WHEN (rn = 1) THEN valid_total
            ELSE NULL::integer
        END) AS top_referee_1_valid_total,
    max(
        CASE
            WHEN (rn = 1) THEN valid_direct
            ELSE NULL::integer
        END) AS top_referee_1_valid_direct,
    max(
        CASE
            WHEN (rn = 1) THEN valid_indirect
            ELSE NULL::integer
        END) AS top_referee_1_valid_indirect,
    max(
        CASE
            WHEN (rn = 2) THEN referee_address
            ELSE NULL::text
        END) AS top_referee_2,
    max(
        CASE
            WHEN (rn = 2) THEN valid_total
            ELSE NULL::integer
        END) AS top_referee_2_valid_total,
    max(
        CASE
            WHEN (rn = 2) THEN valid_direct
            ELSE NULL::integer
        END) AS top_referee_2_valid_direct,
    max(
        CASE
            WHEN (rn = 2) THEN valid_indirect
            ELSE NULL::integer
        END) AS top_referee_2_valid_indirect
   FROM ranked
  WHERE (rn <= 2)
  GROUP BY main_referrer;


ALTER VIEW public.v_cbp_main_referrer_top2_valid OWNER TO postgres;

--
-- Name: eonx_tiers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eonx_tiers ALTER COLUMN id SET DEFAULT nextval('public.eonx_tiers_id_seq'::regclass);


--
-- Name: scanner_state id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scanner_state ALTER COLUMN id SET DEFAULT nextval('public.scanner_state_id_seq'::regclass);


--
-- Name: tier_updates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tier_updates ALTER COLUMN id SET DEFAULT nextval('public.tier_updates_id_seq'::regclass);


--
-- Name: referral_counts cbp_referral_counts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_counts
    ADD CONSTRAINT cbp_referral_counts_pkey PRIMARY KEY (referrer_address);


--
-- Name: cbp_referrals cbp_referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cbp_referrals
    ADD CONSTRAINT cbp_referrals_pkey PRIMARY KEY (id);


--
-- Name: cbp_referrals cbp_referrals_referrer_address_referee_address_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cbp_referrals
    ADD CONSTRAINT cbp_referrals_referrer_address_referee_address_key UNIQUE (referrer_address, referee_address);


--
-- Name: cbp_user_claims cbp_user_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cbp_user_claims
    ADD CONSTRAINT cbp_user_claims_pkey PRIMARY KEY (id);


--
-- Name: cbp_users cbp_users_gindex_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cbp_users
    ADD CONSTRAINT cbp_users_gindex_key UNIQUE (gindex);


--
-- Name: cbp_users cbp_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cbp_users
    ADD CONSTRAINT cbp_users_pkey PRIMARY KEY (id);


--
-- Name: cbp_users cbp_users_ref_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cbp_users
    ADD CONSTRAINT cbp_users_ref_code_key UNIQUE (ref_code);


--
-- Name: cbp_users cbp_users_wallet_address_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cbp_users
    ADD CONSTRAINT cbp_users_wallet_address_key UNIQUE (wallet_address);


--
-- Name: eonx_tiers eonx_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eonx_tiers
    ADD CONSTRAINT eonx_tiers_pkey PRIMARY KEY (id);


--
-- Name: eonx_tiers eonx_tiers_tier_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eonx_tiers
    ADD CONSTRAINT eonx_tiers_tier_no_key UNIQUE (tier_no);


--
-- Name: scanner_state scanner_state_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scanner_state
    ADD CONSTRAINT scanner_state_pkey PRIMARY KEY (id);


--
-- Name: tier_updates tier_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tier_updates
    ADD CONSTRAINT tier_updates_pkey PRIMARY KEY (id);


--
-- Name: cbp_ref_referee_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cbp_ref_referee_idx ON public.cbp_referrals USING btree (referee_address);


--
-- Name: cbp_ref_referrer_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cbp_ref_referrer_idx ON public.cbp_referrals USING btree (referrer_address);


--
-- Name: cbp_ref_referrer_lower_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cbp_ref_referrer_lower_idx ON public.cbp_referrals USING btree (lower(referrer_address));


--
-- Name: cbp_referral_counts_ref_pk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX cbp_referral_counts_ref_pk ON public.referral_counts USING btree (referrer_address);


--
-- Name: cbp_users_wallet_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cbp_users_wallet_idx ON public.cbp_users USING btree (wallet_address);


--
-- Name: referral_counts_ref_lower_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX referral_counts_ref_lower_idx ON public.referral_counts USING btree (lower(referrer_address));


--
-- Name: cbp_referrals bump_ref_count; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER bump_ref_count AFTER INSERT ON public.cbp_referrals FOR EACH ROW EXECUTE FUNCTION public.bump_ref_count();


--
-- Name: cbp_users set_updated_at_cbp_users; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_cbp_users BEFORE UPDATE ON public.cbp_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: cbp_users trg_cbp_users_set_gi; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_cbp_users_set_gi BEFORE INSERT ON public.cbp_users FOR EACH ROW EXECUTE FUNCTION public._cbp_users_set_gi();


--
-- Name: cbp_referrals trg_referral_counts_sync; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_referral_counts_sync AFTER INSERT OR DELETE OR UPDATE ON public.cbp_referrals FOR EACH ROW EXECUTE FUNCTION public.fn_referral_counts_sync();


--
-- Name: cbp_users trg_user_has_bought_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_user_has_bought_change AFTER UPDATE OF has_bought ON public.cbp_users FOR EACH ROW EXECUTE FUNCTION public.fn_on_user_has_bought_change();


--
-- Name: cbp_user_claims Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert for authenticated users only" ON public.cbp_user_claims FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: cbp_user_claims Enable read access for all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for all users" ON public.cbp_user_claims FOR SELECT USING (true);


--
-- Name: cbp_referrals Public insert referrals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public insert referrals" ON public.cbp_referrals FOR INSERT WITH CHECK (true);


--
-- Name: cbp_referrals Public read referrals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public read referrals" ON public.cbp_referrals FOR SELECT USING (true);


--
-- Name: cbp_users Public read users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public read users" ON public.cbp_users FOR SELECT USING (true);


--
-- Name: cbp_users Public update users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public update users" ON public.cbp_users FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: cbp_users Public upsert users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public upsert users" ON public.cbp_users FOR INSERT WITH CHECK (true);


--
-- Name: cbp_referrals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.cbp_referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: cbp_users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.cbp_users ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_counts refcount select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "refcount select" ON public.referral_counts FOR SELECT USING (true);


--
-- Name: cbp_referrals refs insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "refs insert" ON public.cbp_referrals FOR INSERT WITH CHECK (true);


--
-- Name: cbp_referrals refs select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "refs select" ON public.cbp_referrals FOR SELECT USING (true);


--
-- Name: cbp_users users insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users insert" ON public.cbp_users FOR INSERT WITH CHECK (true);


--
-- Name: cbp_users users select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users select" ON public.cbp_users FOR SELECT USING (true);


--
-- Name: cbp_users users update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users update" ON public.cbp_users FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION _cbp_users_duplicate_set_gi(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._cbp_users_duplicate_set_gi() TO anon;
GRANT ALL ON FUNCTION public._cbp_users_duplicate_set_gi() TO authenticated;
GRANT ALL ON FUNCTION public._cbp_users_duplicate_set_gi() TO service_role;


--
-- Name: FUNCTION _cbp_users_set_gi(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._cbp_users_set_gi() TO anon;
GRANT ALL ON FUNCTION public._cbp_users_set_gi() TO authenticated;
GRANT ALL ON FUNCTION public._cbp_users_set_gi() TO service_role;


--
-- Name: FUNCTION bump_ref_count(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.bump_ref_count() TO anon;
GRANT ALL ON FUNCTION public.bump_ref_count() TO authenticated;
GRANT ALL ON FUNCTION public.bump_ref_count() TO service_role;


--
-- Name: FUNCTION fn_on_user_has_bought_change(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fn_on_user_has_bought_change() TO anon;
GRANT ALL ON FUNCTION public.fn_on_user_has_bought_change() TO authenticated;
GRANT ALL ON FUNCTION public.fn_on_user_has_bought_change() TO service_role;


--
-- Name: FUNCTION fn_referral_counts_sync(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fn_referral_counts_sync() TO anon;
GRANT ALL ON FUNCTION public.fn_referral_counts_sync() TO authenticated;
GRANT ALL ON FUNCTION public.fn_referral_counts_sync() TO service_role;


--
-- Name: FUNCTION fn_refresh_referral_counts(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.fn_refresh_referral_counts() FROM PUBLIC;
GRANT ALL ON FUNCTION public.fn_refresh_referral_counts() TO anon;
GRANT ALL ON FUNCTION public.fn_refresh_referral_counts() TO authenticated;
GRANT ALL ON FUNCTION public.fn_refresh_referral_counts() TO service_role;


--
-- Name: FUNCTION fn_set_ref_count(p_referrer text, p_count integer); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.fn_set_ref_count(p_referrer text, p_count integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.fn_set_ref_count(p_referrer text, p_count integer) TO anon;
GRANT ALL ON FUNCTION public.fn_set_ref_count(p_referrer text, p_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.fn_set_ref_count(p_referrer text, p_count integer) TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: TABLE cbp_referrals; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cbp_referrals TO anon;
GRANT ALL ON TABLE public.cbp_referrals TO authenticated;
GRANT ALL ON TABLE public.cbp_referrals TO service_role;


--
-- Name: TABLE cbp_user_claims; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cbp_user_claims TO anon;
GRANT ALL ON TABLE public.cbp_user_claims TO authenticated;
GRANT ALL ON TABLE public.cbp_user_claims TO service_role;


--
-- Name: SEQUENCE cbp_user_claims_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.cbp_user_claims_id_seq TO anon;
GRANT ALL ON SEQUENCE public.cbp_user_claims_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.cbp_user_claims_id_seq TO service_role;


--
-- Name: TABLE cbp_users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cbp_users TO anon;
GRANT ALL ON TABLE public.cbp_users TO authenticated;
GRANT ALL ON TABLE public.cbp_users TO service_role;


--
-- Name: TABLE eonx_tiers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.eonx_tiers TO anon;
GRANT ALL ON TABLE public.eonx_tiers TO authenticated;
GRANT ALL ON TABLE public.eonx_tiers TO service_role;


--
-- Name: SEQUENCE eonx_tiers_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.eonx_tiers_id_seq TO anon;
GRANT ALL ON SEQUENCE public.eonx_tiers_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.eonx_tiers_id_seq TO service_role;


--
-- Name: SEQUENCE eonx_user_gi_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.eonx_user_gi_seq TO anon;
GRANT ALL ON SEQUENCE public.eonx_user_gi_seq TO authenticated;
GRANT ALL ON SEQUENCE public.eonx_user_gi_seq TO service_role;


--
-- Name: TABLE referral_counts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.referral_counts TO anon;
GRANT ALL ON TABLE public.referral_counts TO authenticated;
GRANT ALL ON TABLE public.referral_counts TO service_role;


--
-- Name: TABLE scanner_state; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.scanner_state TO anon;
GRANT ALL ON TABLE public.scanner_state TO authenticated;
GRANT ALL ON TABLE public.scanner_state TO service_role;


--
-- Name: SEQUENCE scanner_state_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.scanner_state_id_seq TO anon;
GRANT ALL ON SEQUENCE public.scanner_state_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.scanner_state_id_seq TO service_role;


--
-- Name: TABLE tier_updates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tier_updates TO anon;
GRANT ALL ON TABLE public.tier_updates TO authenticated;
GRANT ALL ON TABLE public.tier_updates TO service_role;


--
-- Name: SEQUENCE tier_updates_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.tier_updates_id_seq TO anon;
GRANT ALL ON SEQUENCE public.tier_updates_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.tier_updates_id_seq TO service_role;


--
-- Name: TABLE v_cbp_main_referrer_top2_valid; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_cbp_main_referrer_top2_valid TO anon;
GRANT ALL ON TABLE public.v_cbp_main_referrer_top2_valid TO authenticated;
GRANT ALL ON TABLE public.v_cbp_main_referrer_top2_valid TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict fXV2ybaqehZjMP94EsOlvpJmKfpDdANK5TI37BCHRZkh8bDRJq2xQQJtU6BMql2

