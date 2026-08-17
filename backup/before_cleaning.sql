--
-- PostgreSQL database dump
--

\restrict RbofAfaAY9hPPr5la1OZY1YN8SuMasD0qDCCcoVz2N8OrI2UKnn1aXdOSAeEfWJ

-- Dumped from database version 17.9
-- Dumped by pg_dump version 17.9

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
-- Name: decision_finale; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.decision_finale AS ENUM (
    'ADMIS',
    'REJETE',
    'A_CORRIGER',
    'IRRECEVABLE'
);


ALTER TYPE public.decision_finale OWNER TO postgres;

--
-- Name: modele_reponse; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.modele_reponse AS ENUM (
    'EXPERIENCE_ANNEES',
    'NOMBRE_PERSONNES',
    'OUI_NON',
    'TEXTE_COURT',
    'TEXTE_LONG',
    'DATE',
    'LISTE_CHOIX',
    'PLUSIEURS_CHOIX',
    'FICHIER'
);


ALTER TYPE public.modele_reponse OWNER TO postgres;

--
-- Name: phase_document; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.phase_document AS ENUM (
    'PH1',
    'PH2'
);


ALTER TYPE public.phase_document OWNER TO postgres;

--
-- Name: statut_application; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.statut_application AS ENUM (
    'BROUILLON',
    'A_COMPLETER',
    'EN_COURS',
    'SOUMIS',
    'EN_VERIFICATION',
    'A_CORRIGER',
    'EN_NOTATION',
    'ADMIS',
    'REJETE'
);


ALTER TYPE public.statut_application OWNER TO postgres;

--
-- Name: statut_candidature; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.statut_candidature AS ENUM (
    'CREE_PAR_EL_EMAR',
    'LIEN_ENVOYE',
    'ACTIVE',
    'CLOTURE',
    'ANNULEE',
    'BROUILLON',
    'SOUMIS'
);


ALTER TYPE public.statut_candidature OWNER TO postgres;

--
-- Name: statut_compte; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.statut_compte AS ENUM (
    'ACTIF',
    'INACTIF',
    'BLOQUE',
    'EN_ATTENTE'
);


ALTER TYPE public.statut_compte OWNER TO postgres;

--
-- Name: statut_document; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.statut_document AS ENUM (
    'NON_DEPOSE',
    'DEPOSE',
    'EN_VERIFICATION',
    'VALIDE',
    'REFUSE',
    'A_REMPLACER',
    'EXPIRE'
);


ALTER TYPE public.statut_document OWNER TO postgres;

--
-- Name: statut_rfp; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.statut_rfp AS ENUM (
    'BROUILLON',
    'PUBLIE',
    'CLOTURE'
);


ALTER TYPE public.statut_rfp OWNER TO postgres;

--
-- Name: type_utilisateur; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.type_utilisateur AS ENUM (
    'EL_EMAR',
    'CND',
    'IT',
    'DA',
    'ADMIN',
    'ACHAT',
    'TECHNIQUE',
    'COMITE'
);


ALTER TYPE public.type_utilisateur OWNER TO postgres;

--
-- Name: drop_fk_by_column(text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.drop_fk_by_column(p_child_table text, p_child_column text, p_parent_table text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT
            c.conname,
            c.conrelid::regclass::text AS child_table
        FROM pg_constraint c
        JOIN unnest(c.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true
        JOIN pg_attribute a
            ON a.attrelid = c.conrelid
           AND a.attnum = ck.attnum
        WHERE c.contype = 'f'
          AND c.conrelid = p_child_table::regclass
          AND c.confrelid = p_parent_table::regclass
          AND a.attname = p_child_column
    LOOP
        EXECUTE format(
            'ALTER TABLE %s DROP CONSTRAINT %I',
            r.child_table,
            r.conname
        );
    END LOOP;
END;
$$;


ALTER FUNCTION public.drop_fk_by_column(p_child_table text, p_child_column text, p_parent_table text) OWNER TO postgres;

--
-- Name: reset_category_access_on_deactivate(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.reset_category_access_on_deactivate() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF COALESCE(OLD.actif, FALSE) IS TRUE
       AND COALESCE(NEW.actif, FALSE) IS FALSE THEN
        DELETE FROM role_categorie_evaluation_acces
        WHERE categorie_evaluation_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.reset_category_access_on_deactivate() OWNER TO postgres;

--
-- Name: reset_module_access_on_deactivate(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.reset_module_access_on_deactivate() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF COALESCE(OLD.actif, FALSE) IS TRUE
       AND COALESCE(NEW.actif, FALSE) IS FALSE THEN
        UPDATE role_module_acces
        SET autorise = FALSE
        WHERE module_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.reset_module_access_on_deactivate() OWNER TO postgres;

--
-- Name: sync_access_for_module(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_access_for_module() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF COALESCE(NEW.actif, FALSE) IS TRUE THEN
        INSERT INTO role_module_acces (
            role_id,
            module_id,
            autorise
        )
        SELECT
            r.id,
            NEW.id,
            CASE
                WHEN UPPER(COALESCE(r.code_role, '')) IN ('ADMIN', 'ROLE_ADMIN')
                    THEN TRUE
                ELSE FALSE
            END
        FROM role_acces r
        WHERE COALESCE(r.actif, TRUE) IS TRUE
          AND UPPER(COALESCE(r.type_role, 'INTERNE')) = 'INTERNE'
          AND NOT EXISTS (
              SELECT 1
              FROM role_module_acces rma
              WHERE rma.role_id = r.id
                AND rma.module_id = NEW.id
          );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_access_for_module() OWNER TO postgres;

--
-- Name: sync_access_for_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_access_for_role() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF COALESCE(NEW.actif, TRUE) IS TRUE
       AND UPPER(COALESCE(NEW.type_role, 'INTERNE')) = 'INTERNE' THEN
        INSERT INTO role_module_acces (
            role_id,
            module_id,
            autorise
        )
        SELECT
            NEW.id,
            m.id,
            CASE
                WHEN UPPER(COALESCE(NEW.code_role, '')) IN ('ADMIN', 'ROLE_ADMIN')
                    THEN TRUE
                ELSE FALSE
            END
        FROM module_navbar m
        WHERE COALESCE(m.actif, TRUE) IS TRUE
          AND NOT EXISTS (
              SELECT 1
              FROM role_module_acces rma
              WHERE rma.role_id = NEW.id
                AND rma.module_id = m.id
          );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_access_for_role() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: application_candidature; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.application_candidature (
    id bigint NOT NULL,
    candidature_id bigint NOT NULL,
    statut public.statut_application DEFAULT 'BROUILLON'::public.statut_application NOT NULL,
    date_creation timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    date_soumission timestamp without time zone,
    taux_completion numeric(5,2) DEFAULT 0,
    phase1_validee boolean DEFAULT false,
    note_finale numeric(5,2),
    decision_finale public.decision_finale,
    observation_finale text,
    date_decision timestamp without time zone,
    lot_id bigint,
    evaluateur_decision_id bigint,
    CONSTRAINT chk_note_finale CHECK (((note_finale IS NULL) OR ((note_finale >= (0)::numeric) AND (note_finale <= (100)::numeric)))),
    CONSTRAINT chk_taux_completion CHECK (((taux_completion >= (0)::numeric) AND (taux_completion <= (100)::numeric)))
);


ALTER TABLE public.application_candidature OWNER TO postgres;

--
-- Name: application_candidature_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.application_candidature_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.application_candidature_id_seq OWNER TO postgres;

--
-- Name: application_candidature_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.application_candidature_id_seq OWNED BY public.application_candidature.id;


--
-- Name: archive_note_evaluation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.archive_note_evaluation (
    id bigint,
    application_candidature_id bigint,
    critere_evaluation_id bigint,
    note_obtenue numeric(5,2),
    commentaire_el_emar text,
    date_notation timestamp without time zone
);


ALTER TABLE public.archive_note_evaluation OWNER TO postgres;

--
-- Name: candidature; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.candidature (
    id bigint NOT NULL,
    cree_par_utilisateur_id bigint,
    raison_sociale character varying(255),
    forme_juridique character varying(100),
    rne_matricule_fiscal character varying(100),
    date_creation_bureau date,
    adresse_siege text,
    telephone character varying(50),
    email_principal character varying(150),
    site_internet character varying(150),
    ville character varying(100),
    representant_legal character varying(150),
    fonction_representant character varying(150),
    specialites text,
    agrements_certifications text,
    banque_principale character varying(150),
    localisation character varying(150),
    lien_acces text,
    token_acces character varying(255),
    date_expiration_acces timestamp without time zone,
    statut public.statut_candidature DEFAULT 'CREE_PAR_EL_EMAR'::public.statut_candidature NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    acces_bloque boolean DEFAULT false,
    date_soumission timestamp without time zone,
    rne_nom_fichier character varying(255),
    rne_chemin_fichier text,
    rne_type_contenu character varying(120),
    rne_taille_fichier bigint,
    rne_statut character varying(50) DEFAULT 'NON_DEPOSE'::character varying,
    cnss_nom_fichier character varying(255),
    cnss_chemin_fichier text,
    cnss_type_contenu character varying(120),
    cnss_taille_fichier bigint,
    cnss_statut character varying(50) DEFAULT 'NON_DEPOSE'::character varying,
    type_intervenant_id bigint,
    profil_complete boolean DEFAULT false,
    actif boolean DEFAULT true,
    solvabilite_statut character varying(20) DEFAULT 'A_VERIFIER'::character varying NOT NULL,
    solvabilite_commentaire text,
    solvabilite_evaluateur_id bigint,
    solvabilite_date_validation timestamp without time zone,
    nom_entreprise character varying(255),
    adresse character varying(255),
    intervenant_id bigint,
    CONSTRAINT ck_candidature_solvabilite_statut CHECK (((solvabilite_statut)::text = ANY ((ARRAY['A_VERIFIER'::character varying, 'SOLVABLE'::character varying, 'NON_SOLVABLE'::character varying])::text[])))
);


ALTER TABLE public.candidature OWNER TO postgres;

--
-- Name: candidature_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.candidature_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.candidature_id_seq OWNER TO postgres;

--
-- Name: candidature_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.candidature_id_seq OWNED BY public.candidature.id;


--
-- Name: candidature_lot; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.candidature_lot (
    id bigint NOT NULL,
    candidature_id bigint NOT NULL,
    lot_id bigint NOT NULL,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.candidature_lot OWNER TO postgres;

--
-- Name: candidature_lot_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.candidature_lot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.candidature_lot_id_seq OWNER TO postgres;

--
-- Name: candidature_lot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.candidature_lot_id_seq OWNED BY public.candidature_lot.id;


--
-- Name: categorie_evaluation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorie_evaluation (
    id bigint NOT NULL,
    type_intervenant_id bigint NOT NULL,
    lot_id bigint,
    code character varying(80) NOT NULL,
    libelle character varying(180) NOT NULL,
    description text,
    actif boolean DEFAULT true,
    ordre_affichage integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categorie_evaluation OWNER TO postgres;

--
-- Name: categorie_evaluation_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categorie_evaluation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categorie_evaluation_id_seq OWNER TO postgres;

--
-- Name: categorie_evaluation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categorie_evaluation_id_seq OWNED BY public.categorie_evaluation.id;


--
-- Name: classement_zone; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classement_zone (
    id bigint NOT NULL,
    application_candidature_id bigint NOT NULL,
    zone_id bigint NOT NULL,
    categorie character varying(20) NOT NULL,
    commentaire text,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_categorie_zone CHECK (((categorie)::text = ANY ((ARRAY['A'::character varying, 'B'::character varying, 'C'::character varying, 'NON_QUALIFIE'::character varying])::text[])))
);


ALTER TABLE public.classement_zone OWNER TO postgres;

--
-- Name: classement_zone_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.classement_zone_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.classement_zone_id_seq OWNER TO postgres;

--
-- Name: classement_zone_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.classement_zone_id_seq OWNED BY public.classement_zone.id;


--
-- Name: critere_evaluation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.critere_evaluation (
    id bigint NOT NULL,
    grille_evaluation_lot_id bigint NOT NULL,
    lot_id bigint NOT NULL,
    code_critere character varying(80) NOT NULL,
    section character varying(255) NOT NULL,
    libelle_critere text NOT NULL,
    label_candidat text NOT NULL,
    aide_candidat text,
    raison_donnee text,
    note_candidat text,
    note_evaluateur text,
    points_max numeric(6,2) DEFAULT 0,
    bareme_notation text,
    type_notation character varying(50) DEFAULT 'MANUEL'::character varying,
    type_champ character varying(50) DEFAULT 'TEXT'::character varying,
    options_champ text,
    obligatoire boolean DEFAULT false,
    ordre_affichage integer DEFAULT 0,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    categorie_evaluation_id bigint
);


ALTER TABLE public.critere_evaluation OWNER TO postgres;

--
-- Name: critere_evaluation_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.critere_evaluation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.critere_evaluation_id_seq OWNER TO postgres;

--
-- Name: critere_evaluation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.critere_evaluation_id_seq OWNED BY public.critere_evaluation.id;


--
-- Name: critere_piece; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.critere_piece (
    id bigint NOT NULL,
    critere_evaluation_id bigint NOT NULL,
    code_piece character varying(80) NOT NULL,
    nom_piece text NOT NULL,
    raison_piece text,
    note_candidat text,
    note_evaluateur text,
    format_accepte character varying(255) DEFAULT 'PDF'::character varying,
    obligatoire boolean DEFAULT true,
    condition_reponse character varying(255),
    ordre_affichage integer DEFAULT 0,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.critere_piece OWNER TO postgres;

--
-- Name: critere_piece_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.critere_piece_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.critere_piece_id_seq OWNER TO postgres;

--
-- Name: critere_piece_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.critere_piece_id_seq OWNED BY public.critere_piece.id;


--
-- Name: evaluation_critere; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_critere (
    id bigint NOT NULL,
    reponse_critere_id bigint NOT NULL,
    evaluateur_id bigint,
    note_obtenue numeric(5,2) DEFAULT 0 NOT NULL,
    commentaire_evaluateur text,
    statut character varying(30) DEFAULT 'A_VERIFIER'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_evaluation_critere_note CHECK ((note_obtenue >= (0)::numeric)),
    CONSTRAINT chk_evaluation_critere_statut CHECK (((statut)::text = ANY ((ARRAY['CONFORME'::character varying, 'NON_CONFORME'::character varying, 'A_VERIFIER'::character varying])::text[])))
);


ALTER TABLE public.evaluation_critere OWNER TO postgres;

--
-- Name: evaluation_critere_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.evaluation_critere_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluation_critere_id_seq OWNER TO postgres;

--
-- Name: evaluation_critere_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.evaluation_critere_id_seq OWNED BY public.evaluation_critere.id;


--
-- Name: evaluation_element_lock; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_element_lock (
    id bigint NOT NULL,
    candidature_id bigint NOT NULL,
    application_candidature_id bigint,
    element_type character varying(40) NOT NULL,
    element_key character varying(120) NOT NULL,
    verrouille_par_id bigint NOT NULL,
    verrouille_le timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    deverrouille_par_id bigint,
    deverrouille_le timestamp without time zone,
    motif_deverrouillage text
);


ALTER TABLE public.evaluation_element_lock OWNER TO postgres;

--
-- Name: evaluation_element_lock_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.evaluation_element_lock_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluation_element_lock_id_seq OWNER TO postgres;

--
-- Name: evaluation_element_lock_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.evaluation_element_lock_id_seq OWNED BY public.evaluation_element_lock.id;


--
-- Name: grille_evaluation_lot; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grille_evaluation_lot (
    id bigint NOT NULL,
    lot_id bigint NOT NULL,
    code_grille character varying(80) NOT NULL,
    nom_grille character varying(255) NOT NULL,
    description text,
    total_points numeric(6,2) DEFAULT 100,
    seuil_admission numeric(6,2) DEFAULT 80,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.grille_evaluation_lot OWNER TO postgres;

--
-- Name: grille_evaluation_lot_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grille_evaluation_lot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grille_evaluation_lot_id_seq OWNER TO postgres;

--
-- Name: grille_evaluation_lot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grille_evaluation_lot_id_seq OWNED BY public.grille_evaluation_lot.id;


--
-- Name: historique_action; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.historique_action (
    id bigint NOT NULL,
    utilisateur_id bigint,
    candidature_id bigint,
    application_candidature_id bigint,
    action character varying(150) NOT NULL,
    description text,
    date_action timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.historique_action OWNER TO postgres;

--
-- Name: historique_action_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.historique_action_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.historique_action_id_seq OWNER TO postgres;

--
-- Name: historique_action_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.historique_action_id_seq OWNED BY public.historique_action.id;


--
-- Name: lot; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lot (
    id bigint NOT NULL,
    code_lot character varying(50) NOT NULL,
    nom_lot character varying(150) NOT NULL,
    description text,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    type_intervenant_id bigint,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.lot OWNER TO postgres;

--
-- Name: lot_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lot_id_seq OWNER TO postgres;

--
-- Name: lot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lot_id_seq OWNED BY public.lot.id;


--
-- Name: module_navbar; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_navbar (
    id bigint NOT NULL,
    code_module character varying(120) NOT NULL,
    groupe character varying(150) NOT NULL,
    libelle character varying(180) NOT NULL,
    description text,
    route_front character varying(255),
    icone character varying(100),
    ordre_groupe integer DEFAULT 0,
    ordre_module integer DEFAULT 0,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.module_navbar OWNER TO postgres;

--
-- Name: module_navbar_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.module_navbar_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.module_navbar_id_seq OWNER TO postgres;

--
-- Name: module_navbar_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.module_navbar_id_seq OWNED BY public.module_navbar.id;


--
-- Name: notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification (
    id bigint NOT NULL,
    expediteur_id bigint,
    destinataire_id bigint,
    candidature_id bigint,
    application_candidature_id bigint,
    message text NOT NULL,
    type_notification character varying(100),
    lu boolean DEFAULT false,
    date_creation timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reponse_critere_id bigint,
    critere_evaluation_id bigint,
    code_critere character varying(255),
    libelle_critere character varying(500),
    traitee boolean DEFAULT false NOT NULL,
    date_traitement timestamp without time zone
);


ALTER TABLE public.notification OWNER TO postgres;

--
-- Name: notification_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_id_seq OWNER TO postgres;

--
-- Name: notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_id_seq OWNED BY public.notification.id;


--
-- Name: password_reset_token; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_token (
    id bigint NOT NULL,
    utilisateur_id bigint NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.password_reset_token OWNER TO postgres;

--
-- Name: password_reset_token_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_reset_token_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_token_id_seq OWNER TO postgres;

--
-- Name: password_reset_token_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_reset_token_id_seq OWNED BY public.password_reset_token.id;


--
-- Name: piece_candidature_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.piece_candidature_config (
    id bigint NOT NULL,
    code_piece character varying(80) NOT NULL,
    nom_piece text NOT NULL,
    raison_piece text,
    note_candidat text,
    note_evaluateur text,
    format_accepte character varying(255) DEFAULT 'PDF'::character varying,
    obligatoire boolean DEFAULT true,
    ordre_affichage integer DEFAULT 0,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.piece_candidature_config OWNER TO postgres;

--
-- Name: piece_candidature_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.piece_candidature_config_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.piece_candidature_config_id_seq OWNER TO postgres;

--
-- Name: piece_candidature_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.piece_candidature_config_id_seq OWNED BY public.piece_candidature_config.id;


--
-- Name: piece_candidature_deposee; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.piece_candidature_deposee (
    id bigint NOT NULL,
    candidature_id bigint NOT NULL,
    piece_candidature_config_id bigint NOT NULL,
    nom_fichier character varying(255),
    chemin_fichier text,
    type_contenu character varying(120),
    taille_fichier bigint,
    statut character varying(50) DEFAULT 'DEPOSE'::character varying,
    commentaire text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.piece_candidature_deposee OWNER TO postgres;

--
-- Name: piece_candidature_deposee_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.piece_candidature_deposee_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.piece_candidature_deposee_id_seq OWNER TO postgres;

--
-- Name: piece_candidature_deposee_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.piece_candidature_deposee_id_seq OWNED BY public.piece_candidature_deposee.id;


--
-- Name: piece_critere_deposee; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.piece_critere_deposee (
    id bigint NOT NULL,
    candidature_id bigint NOT NULL,
    application_candidature_id bigint NOT NULL,
    critere_piece_id bigint NOT NULL,
    nom_fichier character varying(255),
    chemin_fichier text,
    type_contenu character varying(120),
    taille_fichier bigint,
    statut character varying(50) DEFAULT 'DEPOSE'::character varying,
    commentaire text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.piece_critere_deposee OWNER TO postgres;

--
-- Name: piece_critere_deposee_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.piece_critere_deposee_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.piece_critere_deposee_id_seq OWNER TO postgres;

--
-- Name: piece_critere_deposee_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.piece_critere_deposee_id_seq OWNED BY public.piece_critere_deposee.id;


--
-- Name: projet_reference; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projet_reference (
    id bigint NOT NULL,
    application_candidature_id bigint NOT NULL,
    nom_projet character varying(255),
    lot_concerne character varying(150),
    maitre_ouvrage character varying(255),
    ville character varying(100),
    zone character varying(100),
    type_projet character varying(150),
    surface_m2 numeric(15,2),
    niveaux_r_plus integer,
    nombre_sous_sols integer,
    annee_livraison integer,
    bim_oui_non boolean,
    seuil_ok boolean,
    fichier_p11 text,
    fichier_p12 text,
    montant numeric(19,2),
    mission_realisee text,
    adresse_projet text,
    latitude double precision,
    longitude double precision,
    zone_el_emar_id bigint,
    zone_el_emar_nom character varying(150),
    zone_validee boolean DEFAULT false,
    zone_el_emar_commentaire text,
    CONSTRAINT chk_annee_livraison CHECK (((annee_livraison IS NULL) OR (annee_livraison >= 1900))),
    CONSTRAINT chk_nombre_sous_sols CHECK (((nombre_sous_sols IS NULL) OR (nombre_sous_sols >= 0))),
    CONSTRAINT chk_surface_m2 CHECK (((surface_m2 IS NULL) OR (surface_m2 >= (0)::numeric)))
);


ALTER TABLE public.projet_reference OWNER TO postgres;

--
-- Name: projet_reference_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.projet_reference_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projet_reference_id_seq OWNER TO postgres;

--
-- Name: projet_reference_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projet_reference_id_seq OWNED BY public.projet_reference.id;


--
-- Name: reponse_critere; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reponse_critere (
    id bigint NOT NULL,
    candidature_id bigint NOT NULL,
    application_candidature_id bigint NOT NULL,
    critere_evaluation_id bigint NOT NULL,
    valeur_text text,
    valeur_number numeric(12,2),
    valeur_boolean boolean,
    valeur_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.reponse_critere OWNER TO postgres;

--
-- Name: reponse_critere_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reponse_critere_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reponse_critere_id_seq OWNER TO postgres;

--
-- Name: reponse_critere_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reponse_critere_id_seq OWNED BY public.reponse_critere.id;


--
-- Name: role_acces; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_acces (
    id bigint NOT NULL,
    code_role character varying(80) NOT NULL,
    nom_role character varying(150) NOT NULL,
    description text,
    type_role character varying(30) DEFAULT 'INTERNE'::character varying,
    role_systeme boolean DEFAULT false,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.role_acces OWNER TO postgres;

--
-- Name: role_acces_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.role_acces_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_acces_id_seq OWNER TO postgres;

--
-- Name: role_acces_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.role_acces_id_seq OWNED BY public.role_acces.id;


--
-- Name: role_categorie_evaluation_acces; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_categorie_evaluation_acces (
    role_id bigint NOT NULL,
    categorie_evaluation_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.role_categorie_evaluation_acces OWNER TO postgres;

--
-- Name: role_module_acces; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_module_acces (
    id bigint NOT NULL,
    role_id bigint NOT NULL,
    module_id bigint NOT NULL,
    autorise boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.role_module_acces OWNER TO postgres;

--
-- Name: role_module_acces_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.role_module_acces_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_module_acces_id_seq OWNER TO postgres;

--
-- Name: role_module_acces_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.role_module_acces_id_seq OWNED BY public.role_module_acces.id;


--
-- Name: type_intervenant; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.type_intervenant (
    id bigint NOT NULL,
    code character varying(50) NOT NULL,
    libelle character varying(150) NOT NULL,
    description text,
    actif boolean DEFAULT true,
    ordre_affichage integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_intervenant OWNER TO postgres;

--
-- Name: type_intervenant_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.type_intervenant_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.type_intervenant_id_seq OWNER TO postgres;

--
-- Name: type_intervenant_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.type_intervenant_id_seq OWNED BY public.type_intervenant.id;


--
-- Name: utilisateur; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.utilisateur (
    id bigint NOT NULL,
    nom character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    mot_de_passe character varying(255) NOT NULL,
    type_utilisateur public.type_utilisateur NOT NULL,
    statut_compte public.statut_compte DEFAULT 'ACTIF'::public.statut_compte NOT NULL,
    premiere_connexion boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    intervenant_id bigint,
    fonction character varying(120),
    telephone character varying(50),
    must_change_password boolean DEFAULT true,
    actif boolean DEFAULT true,
    role_id bigint,
    candidature_id bigint,
    departement character varying(20),
    CONSTRAINT chk_utilisateur_departement CHECK (((departement)::text = ANY ((ARRAY['IT'::character varying, 'ACHAT'::character varying, 'COMITE'::character varying, 'TECHNIQUE'::character varying])::text[])))
);


ALTER TABLE public.utilisateur OWNER TO postgres;

--
-- Name: utilisateur_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.utilisateur_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.utilisateur_id_seq OWNER TO postgres;

--
-- Name: utilisateur_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.utilisateur_id_seq OWNED BY public.utilisateur.id;


--
-- Name: workflow_etape_el_emar; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflow_etape_el_emar (
    id bigint NOT NULL,
    candidature_id bigint NOT NULL,
    utilisateur_affecte_id bigint NOT NULL,
    code_etape character varying(80) NOT NULL,
    libelle_etape character varying(160) NOT NULL,
    ordre integer NOT NULL,
    statut character varying(20) DEFAULT 'EN_ATTENTE'::character varying NOT NULL,
    commentaire_transmission text,
    date_debut timestamp without time zone,
    date_fin timestamp without time zone,
    date_reouverture timestamp without time zone,
    motif_reouverture text,
    cree_par_id bigint,
    modifie_par_id bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version bigint DEFAULT 0 NOT NULL,
    CONSTRAINT ck_workflow_ordre CHECK ((ordre > 0)),
    CONSTRAINT ck_workflow_statut CHECK (((statut)::text = ANY ((ARRAY['EN_ATTENTE'::character varying, 'A_TRAITER'::character varying, 'EN_COURS'::character varying, 'TERMINEE'::character varying, 'REOUVERTE'::character varying, 'ANNULEE'::character varying])::text[])))
);


ALTER TABLE public.workflow_etape_el_emar OWNER TO postgres;

--
-- Name: workflow_etape_el_emar_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.workflow_etape_el_emar_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.workflow_etape_el_emar_id_seq OWNER TO postgres;

--
-- Name: workflow_etape_el_emar_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.workflow_etape_el_emar_id_seq OWNED BY public.workflow_etape_el_emar.id;


--
-- Name: workflow_modele_etape; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflow_modele_etape (
    id bigint NOT NULL,
    code_etape character varying(80) NOT NULL,
    libelle_etape character varying(160) NOT NULL,
    ordre integer NOT NULL,
    departement_code character varying(30) NOT NULL,
    utilisateur_defaut_id bigint,
    actif boolean DEFAULT true NOT NULL,
    modifie_par_id bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version bigint DEFAULT 0 NOT NULL,
    CONSTRAINT ck_workflow_modele_departement CHECK ((upper((departement_code)::text) = ANY (ARRAY['ACHAT'::text, 'TECHNIQUE'::text, 'COMITE'::text, 'IT'::text]))),
    CONSTRAINT ck_workflow_modele_ordre CHECK ((ordre > 0))
);


ALTER TABLE public.workflow_modele_etape OWNER TO postgres;

--
-- Name: workflow_modele_etape_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.workflow_modele_etape_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.workflow_modele_etape_id_seq OWNER TO postgres;

--
-- Name: workflow_modele_etape_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.workflow_modele_etape_id_seq OWNED BY public.workflow_modele_etape.id;


--
-- Name: zone; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.zone (
    id bigint NOT NULL,
    nom_zone character varying(150) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    utilisateur_id bigint,
    adresse text,
    latitude double precision,
    longitude double precision,
    description text,
    updated_at timestamp without time zone
);


ALTER TABLE public.zone OWNER TO postgres;

--
-- Name: zone_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.zone_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.zone_id_seq OWNER TO postgres;

--
-- Name: zone_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.zone_id_seq OWNED BY public.zone.id;


--
-- Name: application_candidature id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_candidature ALTER COLUMN id SET DEFAULT nextval('public.application_candidature_id_seq'::regclass);


--
-- Name: candidature id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidature ALTER COLUMN id SET DEFAULT nextval('public.candidature_id_seq'::regclass);


--
-- Name: candidature_lot id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidature_lot ALTER COLUMN id SET DEFAULT nextval('public.candidature_lot_id_seq'::regclass);


--
-- Name: categorie_evaluation id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorie_evaluation ALTER COLUMN id SET DEFAULT nextval('public.categorie_evaluation_id_seq'::regclass);


--
-- Name: classement_zone id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classement_zone ALTER COLUMN id SET DEFAULT nextval('public.classement_zone_id_seq'::regclass);


--
-- Name: critere_evaluation id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.critere_evaluation ALTER COLUMN id SET DEFAULT nextval('public.critere_evaluation_id_seq'::regclass);


--
-- Name: critere_piece id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.critere_piece ALTER COLUMN id SET DEFAULT nextval('public.critere_piece_id_seq'::regclass);


--
-- Name: evaluation_critere id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_critere ALTER COLUMN id SET DEFAULT nextval('public.evaluation_critere_id_seq'::regclass);


--
-- Name: evaluation_element_lock id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_element_lock ALTER COLUMN id SET DEFAULT nextval('public.evaluation_element_lock_id_seq'::regclass);


--
-- Name: grille_evaluation_lot id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grille_evaluation_lot ALTER COLUMN id SET DEFAULT nextval('public.grille_evaluation_lot_id_seq'::regclass);


--
-- Name: historique_action id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historique_action ALTER COLUMN id SET DEFAULT nextval('public.historique_action_id_seq'::regclass);


--
-- Name: lot id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lot ALTER COLUMN id SET DEFAULT nextval('public.lot_id_seq'::regclass);


--
-- Name: module_navbar id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_navbar ALTER COLUMN id SET DEFAULT nextval('public.module_navbar_id_seq'::regclass);


--
-- Name: notification id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification ALTER COLUMN id SET DEFAULT nextval('public.notification_id_seq'::regclass);


--
-- Name: password_reset_token id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_token ALTER COLUMN id SET DEFAULT nextval('public.password_reset_token_id_seq'::regclass);


--
-- Name: piece_candidature_config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.piece_candidature_config ALTER COLUMN id SET DEFAULT nextval('public.piece_candidature_config_id_seq'::regclass);


--
-- Name: piece_candidature_deposee id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.piece_candidature_deposee ALTER COLUMN id SET DEFAULT nextval('public.piece_candidature_deposee_id_seq'::regclass);


--
-- Name: piece_critere_deposee id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.piece_critere_deposee ALTER COLUMN id SET DEFAULT nextval('public.piece_critere_deposee_id_seq'::regclass);


--
-- Name: projet_reference id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projet_reference ALTER COLUMN id SET DEFAULT nextval('public.projet_reference_id_seq'::regclass);


--
-- Name: reponse_critere id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reponse_critere ALTER COLUMN id SET DEFAULT nextval('public.reponse_critere_id_seq'::regclass);


--
-- Name: role_acces id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_acces ALTER COLUMN id SET DEFAULT nextval('public.role_acces_id_seq'::regclass);


--
-- Name: role_module_acces id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_module_acces ALTER COLUMN id SET DEFAULT nextval('public.role_module_acces_id_seq'::regclass);


--
-- Name: type_intervenant id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_intervenant ALTER COLUMN id SET DEFAULT nextval('public.type_intervenant_id_seq'::regclass);


--
-- Name: utilisateur id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateur ALTER COLUMN id SET DEFAULT nextval('public.utilisateur_id_seq'::regclass);


--
-- Name: workflow_etape_el_emar id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_etape_el_emar ALTER COLUMN id SET DEFAULT nextval('public.workflow_etape_el_emar_id_seq'::regclass);


--
-- Name: workflow_modele_etape id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_modele_etape ALTER COLUMN id SET DEFAULT nextval('public.workflow_modele_etape_id_seq'::regclass);


--
-- Name: zone id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zone ALTER COLUMN id SET DEFAULT nextval('public.zone_id_seq'::regclass);


--
-- Data for Name: application_candidature; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.application_candidature (id, candidature_id, statut, date_creation, date_soumission, taux_completion, phase1_validee, note_finale, decision_finale, observation_finale, date_decision, lot_id, evaluateur_decision_id) FROM stdin;
20	15	SOUMIS	2026-08-03 12:10:04.485747	2026-08-03 12:11:15.602739	0.00	f	100.00	\N	\N	\N	67	\N
21	17	EN_VERIFICATION	2026-08-06 13:53:19.201418	2026-08-06 13:53:19.201418	100.00	t	40.00	REJETE	<80	2026-08-07 10:35:31.727155	82	28
\.


--
-- Data for Name: archive_note_evaluation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.archive_note_evaluation (id, application_candidature_id, critere_evaluation_id, note_obtenue, commentaire_el_emar, date_notation) FROM stdin;
\.


--
-- Data for Name: candidature; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.candidature (id, cree_par_utilisateur_id, raison_sociale, forme_juridique, rne_matricule_fiscal, date_creation_bureau, adresse_siege, telephone, email_principal, site_internet, ville, representant_legal, fonction_representant, specialites, agrements_certifications, banque_principale, localisation, lien_acces, token_acces, date_expiration_acces, statut, created_at, updated_at, acces_bloque, date_soumission, rne_nom_fichier, rne_chemin_fichier, rne_type_contenu, rne_taille_fichier, rne_statut, cnss_nom_fichier, cnss_chemin_fichier, cnss_type_contenu, cnss_taille_fichier, cnss_statut, type_intervenant_id, profil_complete, actif, solvabilite_statut, solvabilite_commentaire, solvabilite_evaluateur_id, solvabilite_date_validation, nom_entreprise, adresse, intervenant_id) FROM stdin;
9	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	BROUILLON	2026-07-02 15:00:31.27736	2026-07-30 10:16:59.975217	f	\N	\N	\N	\N	\N	NON_DEPOSE	\N	\N	\N	\N	NON_DEPOSE	\N	\N	\N	A_VERIFIER	\N	\N	\N	\N	\N	\N
15	\N	Elite	SARS	0214447555	2025-02-03	Ahmed Tlili, Délégation El Omrane Supérieur, Tunis, Gouvernorat Tunis, 1091, Tunisie	71456789	oumeyma.tibaoui@esprit.tn		Tunis	Ahmed	Responsable technique					\N	\N	\N	SOUMIS	2026-08-02 19:56:11.771203	2026-08-06 11:46:46.189721	t	2026-08-03 12:11:15.602739	testt.pdf	uploads\\candidatures\\15\\phase1\\RNE_1785755371841_testt.pdf	application/pdf	42252	CONFORME	testt.pdf	uploads\\candidatures\\15\\phase1\\CNSS_1785755371872_testt.pdf	application/pdf	42252	CONFORME	13	f	t	SOLVABLE	\N	23	2026-08-05 19:31:09.406471	Elite	\N	\N
16	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	BROUILLON	2026-08-06 13:47:16.770027	2026-08-06 13:47:16.770027	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	12	f	t	A_VERIFIER	\N	\N	\N	Garni	\N	\N
17	37	FOURNISSEUR TEST WORKFLOW SARL	SARL	TEST-WF-2026-001	2020-01-15	Centre Urbain Nord, Tunis	+21670000006	candidat.workflow@test.candidat.local	https://test-workflow.local	Tunis	Responsable Test	Gérant	Études, coordination et assistance technique	ISO 9001 — donnée de test	Banque de test	Tunis	\N	\N	\N	SOUMIS	2026-08-06 13:53:19.201418	2026-08-06 14:50:11.841355	f	2026-08-06 13:53:19.201418	RNE_TEST.pdf	\N	\N	\N	CONFORME	CNSS_TEST.pdf	\N	\N	\N	CONFORME	15	t	t	SOLVABLE	bienn	33	2026-08-06 14:50:06.336686	\N	\N	\N
8	\N	Bureau d’Études Atlas Ingénierie SARL	SARL	B123456789	2021-12-18	Avenue Habib Bourguiba, Immeuble Atlas, 2ème étage	71456789	contact@atlas-ingenierie.tn	www.atlas-ingenierie.tn	Tunis	Mohamed Ben Salem	Gérant	Études structure béton armé, études VRD, fluides, électricité CFO/CFA, coordination OPC	Agrément bureau d’études bâtiment catégorie B, certification ISO 9001 en cours	BIAT	Tunis — Les Berges du Lac	\N	\N	\N	BROUILLON	2026-07-02 14:06:43.576226	2026-08-02 20:09:57.721045	f	\N	testt.pdf	uploads\\candidatures\\8\\phase1\\RNE_1783690458443_testt.pdf	application/pdf	42252	DEPOSE	\N	\N	\N	\N	NON_DEPOSE	\N	\N	\N	A_VERIFIER	\N	\N	\N	Bureau d’Études Atlas Ingénierie SARL	Avenue Habib Bourguiba, Immeuble Atlas, 2ème étage	\N
11	\N	Bureau d’Études Atlas Ingénierie	SARL	B123456789	2023-02-21	Avenue Habib Bourguiba, Immeuble Atlas, 2ème étage	71456789	contact@atlas-ingenierie.tn	www.atlas-ingenierie.tn	Tunis	Mohamed Ben Salem	Gérant	testt	testt	BIAT	Tunis — Les Berges du Lac	\N	\N	\N	BROUILLON	2026-07-11 16:37:57.023448	2026-08-02 20:09:57.721045	f	\N	\N	\N	\N	\N	NON_DEPOSE	testt.pdf	uploads\\candidatures\\11\\phase1\\CNSS_1783784366639_testt.pdf	application/pdf	42252	DEPOSE	\N	\N	\N	A_VERIFIER	\N	\N	\N	Bureau d’Études Atlas Ingénierie	Avenue Habib Bourguiba, Immeuble Atlas, 2ème étage	\N
\.


--
-- Data for Name: candidature_lot; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.candidature_lot (id, candidature_id, lot_id, actif, created_at) FROM stdin;
27	15	67	t	2026-08-02 19:56:11.800204
28	15	69	t	2026-08-02 19:56:11.803206
29	15	71	t	2026-08-02 19:56:11.806204
7	8	66	t	2026-07-02 14:49:32.805792
8	8	64	t	2026-07-02 14:49:32.805792
30	16	64	t	2026-08-06 13:47:16.817022
31	16	65	t	2026-08-06 13:47:16.824077
32	16	66	t	2026-08-06 13:47:16.827022
33	16	62	t	2026-08-06 13:47:16.828021
34	16	63	t	2026-08-06 13:47:16.831081
35	17	82	t	2026-08-06 13:53:19.201418
\.


--
-- Data for Name: categorie_evaluation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categorie_evaluation (id, type_intervenant_id, lot_id, code, libelle, description, actif, ordre_affichage, created_at, updated_at) FROM stdin;
129	13	70	CAT-A6-ALU-02	Capacité et expérience	Pondération PDF : 60.00/100.	t	2	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
130	12	62	CAT-D4-OPC-03	Outils et maturité numérique	Pondération PDF : 16.00/100.	t	3	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
131	12	62	CAT-D4-OPC-01	Appréciation du bureau	Pondération PDF : 30.00/100.	t	1	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
132	12	64	CAT-D2-STR-01	Appréciation du bureau	Pondération PDF : 30.00/100.	t	1	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
133	12	65	CAT-D1-IDEE-04	Faisabilité technique	Pondération PDF : 20.00/100.	t	4	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
134	12	66	CAT-D1-ARCH-02	Expérience spécifique	Pondération PDF : 40.00/100.	t	2	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
135	13	71	CAT-A5-ASC-02	Capacité et expérience	Pondération PDF : 60.00/100.	t	2	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
136	13	72	CAT-A3-ELEC-02	Capacité et expérience	Pondération PDF : 60.00/100.	t	2	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
137	13	68	CAT-A8-CUIS-01	Appréciation de l’entreprise	Pondération PDF : 35.00/100.	t	1	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
138	13	71	CAT-A5-ASC-03	Méthodes et outils	Pondération PDF : 5.00/100.	t	3	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
139	13	73	CAT-A2-FLU-03	BIM	Pondération PDF : 5.00/100.	t	3	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
140	14	81	CAT-T1-TECH-01	Organisation et moyens	Pondération PDF : 30.00/100.	t	1	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
141	14	76	CAT-T6-ECL-01	Évaluation technique et décorative	Pondération PDF : 100.00/100.	t	1	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
142	13	69	CAT-A7-BOIS-03	Digitalisation	Pondération PDF : 5.00/100.	t	3	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
143	12	64	CAT-D2-STR-03	BIM	Pondération PDF : 16.00/100.	t	3	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
144	12	65	CAT-D1-IDEE-02	Intégration et contexte	Pondération PDF : 20.00/100.	t	2	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
145	13	72	CAT-A3-ELEC-01	Appréciation de l’entreprise	Pondération PDF : 35.00/100.	t	1	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
146	13	69	CAT-A7-BOIS-02	Capacité et expérience	Pondération PDF : 60.00/100.	t	2	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
147	13	68	CAT-A8-CUIS-03	Digitalisation	Pondération PDF : 5.00/100.	t	3	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
148	14	77	CAT-T5-PORTES-01	Évaluation technique et décorative	Pondération PDF : 100.00/100.	t	1	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
149	12	65	CAT-D1-IDEE-03	Fonctionnalité	Pondération PDF : 20.00/100.	t	3	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
150	13	70	CAT-A6-ALU-01	Appréciation de l’entreprise	Pondération PDF : 35.00/100.	t	1	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
151	12	62	CAT-D4-OPC-02	Expérience spécifique	Pondération PDF : 54.00/100.	t	2	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
152	14	78	CAT-T4-ELEC-01	Évaluation technique et décorative	Pondération PDF : 100.00/100.	t	1	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
153	12	66	CAT-D1-ARCH-03	BIM	Pondération PDF : 20.00/100.	t	3	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
154	14	81	CAT-T1-TECH-03	Fiabilité	Pondération PDF : 20.00/100.	t	3	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
155	14	80	CAT-T2-SOL-01	Évaluation technique et décorative	Pondération PDF : 100.00/100.	t	1	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
156	12	63	CAT-D3-BET-02	Expérience spécifique	Pondération PDF : 54.00/100.	t	2	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
157	13	68	CAT-A8-CUIS-02	Capacité et expérience	Pondération PDF : 60.00/100.	t	2	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
158	13	69	CAT-A7-BOIS-01	Appréciation de l’entreprise	Pondération PDF : 35.00/100.	t	1	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
159	12	65	CAT-D1-IDEE-05	Clarté du dossier	Pondération PDF : 10.00/100.	t	5	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
160	13	70	CAT-A6-ALU-03	Digitalisation	Pondération PDF : 5.00/100.	t	3	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
161	13	72	CAT-A3-ELEC-03	BIM	Pondération PDF : 5.00/100.	t	3	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
162	13	73	CAT-A2-FLU-01	Appréciation de l’entreprise	Pondération PDF : 35.00/100.	t	1	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
163	12	63	CAT-D3-BET-03	BIM	Pondération PDF : 16.00/100.	t	3	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
164	12	63	CAT-D3-BET-01	Appréciation du bureau	Pondération PDF : 30.00/100.	t	1	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
165	13	67	CAT-A9-JARD-02	Capacité et expérience	Pondération PDF : 50.00/100.	t	2	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
166	12	64	CAT-D2-STR-02	Expérience spécifique	Pondération PDF : 54.00/100.	t	2	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
167	12	66	CAT-D1-ARCH-01	Appréciation du bureau	Pondération PDF : 40.00/100.	t	1	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
168	14	81	CAT-T1-TECH-02	Capacité et performance	Pondération PDF : 50.00/100.	t	2	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
169	14	75	CAT-T7-DIV-01	Évaluation technique et décorative	Pondération PDF : 100.00/100.	t	1	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
170	13	67	CAT-A9-JARD-01	Organisation et moyens	Pondération PDF : 30.00/100.	t	1	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
171	13	71	CAT-A5-ASC-01	Organisation et moyens	Pondération PDF : 35.00/100.	t	1	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
172	12	65	CAT-D1-IDEE-01	Qualité architecturale	Pondération PDF : 30.00/100.	t	1	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
173	14	79	CAT-T3-SAN-01	Évaluation technique et décorative	Pondération PDF : 100.00/100.	t	1	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
174	13	73	CAT-A2-FLU-02	Capacité et expérience	Pondération PDF : 60.00/100.	t	2	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
175	13	67	CAT-A9-JARD-03	Qualité et maintenance	Pondération PDF : 20.00/100.	t	3	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175
176	15	82	TEST_WF_CAT	Évaluation technique de test	Catégorie dédiée au scénario complet.	t	1	2026-08-06 13:53:19.201418	2026-08-06 13:53:19.201418
\.


--
-- Data for Name: classement_zone; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classement_zone (id, application_candidature_id, zone_id, categorie, commentaire, actif, created_at) FROM stdin;
17	21	41	B	\N	t	2026-08-07 10:02:32.2989
\.


--
-- Data for Name: critere_evaluation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.critere_evaluation (id, grille_evaluation_lot_id, lot_id, code_critere, section, libelle_critere, label_candidat, aide_candidat, raison_donnee, note_candidat, note_evaluateur, points_max, bareme_notation, type_notation, type_champ, options_champ, obligatoire, ordre_affichage, actif, created_at, updated_at, categorie_evaluation_id) FROM stdin;
230	41	62	PDF-D4-OPC-02	Expérience spécifique	Expérience spécifique OPC	Expérience spécifique OPC	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité.	54.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175	151
231	42	63	PDF-D3-BET-02	Expérience spécifique	Expérience spécifique	Expérience spécifique	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité.	54.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175	156
232	43	64	PDF-D2-STR-02	Expérience spécifique	Expérience spécifique	Expérience spécifique	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité.	54.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175	166
233	45	66	PDF-D1-ARCH-02	Expérience spécifique	Expérience spécifique	Expérience spécifique	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité.	40.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-08-03 11:50:32.562175	2026-08-03 11:50:32.562175	134
208	50	71	PDF-A5-ASC-01	Organisation et moyens	Organisation et moyens	Organisation et moyens	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	35.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	f	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	171
181	41	62	PDF-D4-OPC-03	Outils et maturité numérique	Outils et maturité numérique	Outils et maturité numérique	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	16.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	130
182	42	63	PDF-D3-BET-01	Appréciation du bureau	Appréciation du bureau	Appréciation du bureau	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	30.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	164
184	42	63	PDF-D3-BET-03	BIM	Expérience BIM	Expérience BIM	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	16.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	163
185	43	64	PDF-D2-STR-01	Appréciation du bureau	Appréciation du bureau	Appréciation du bureau	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	30.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	132
187	43	64	PDF-D2-STR-03	BIM	Expérience BIM	Expérience BIM	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	16.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	143
188	44	65	PDF-D1-IDEE-01	Qualité architecturale	Qualité architecturale	Qualité architecturale	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	30.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	172
189	44	65	PDF-D1-IDEE-02	Intégration et contexte	Intégration urbaine, environnementale et contexte	Intégration urbaine, environnementale et contexte	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	144
190	44	65	PDF-D1-IDEE-03	Fonctionnalité	Organisation fonctionnelle et flexibilité	Organisation fonctionnelle et flexibilité	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	149
191	44	65	PDF-D1-IDEE-04	Faisabilité technique	Faisabilité technique et rationalité économique	Faisabilité technique et rationalité économique	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	4	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	133
192	44	65	PDF-D1-IDEE-05	Clarté du dossier	Clarté, lisibilité et complétude du dossier	Clarté, lisibilité et complétude du dossier	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	10.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	5	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	159
193	45	66	PDF-D1-ARCH-01	Appréciation du bureau	Appréciation du bureau	Appréciation du bureau	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	40.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	167
195	45	66	PDF-D1-ARCH-03	BIM	Expérience BIM	Expérience BIM	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	153
196	46	67	PDF-A9-JARD-01	Organisation et moyens	Organisation et moyens	Organisation et moyens	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	30.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	170
198	46	67	PDF-A9-JARD-03	Qualité et maintenance	Qualité et maintenance	Qualité et maintenance	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	175
199	47	68	PDF-A8-CUIS-01	Appréciation de l’entreprise	Appréciation de l’entreprise	Appréciation de l’entreprise	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	35.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	137
200	47	68	PDF-A8-CUIS-02	Capacité et expérience	Capacité et expérience	Capacité et expérience	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	60.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	157
206	49	70	PDF-A6-ALU-02	Capacité et expérience	Capacité et expérience globale	Capacité et expérience globale	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	60.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	129
207	49	70	PDF-A6-ALU-03	Digitalisation	Maturité numérique	Maturité numérique	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	5.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	160
209	50	71	PDF-A5-ASC-02	Capacité et expérience	Capacité et expérience	Capacité et expérience	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	60.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	135
221	55	76	PDF-T6-ECL-01	Évaluation technique et décorative	Éclairage et lustres	Éclairage et lustres	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	100.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	141
222	56	77	PDF-T5-PORTES-01	Évaluation technique et décorative	Portes intérieures et blindées	Portes intérieures et blindées	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	100.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	148
223	57	78	PDF-T4-ELEC-01	Évaluation technique et décorative	Appareils électroménagers	Appareils électroménagers	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	100.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	152
224	58	79	PDF-T3-SAN-01	Évaluation technique et décorative	Sanitaires et robinetterie	Sanitaires et robinetterie	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	100.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	173
225	59	80	PDF-T2-SOL-01	Évaluation technique et décorative	Revêtements de sol et marbre	Revêtements de sol et marbre	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	100.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	155
226	60	81	PDF-T1-TECH-01	Organisation et moyens	Organisation et moyens	Organisation et moyens	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	30.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	140
227	60	81	PDF-T1-TECH-02	Capacité et performance	Capacité et performance	Capacité et performance	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	50.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	168
228	60	81	PDF-T1-TECH-03	Fiabilité	Fiabilité	Fiabilité	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	154
201	47	68	PDF-A8-CUIS-03	Digitalisation	Maturité numérique	Maturité numérique	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	5.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	147
202	48	69	PDF-A7-BOIS-01	Appréciation de l’entreprise	Appréciation de l’entreprise	Appréciation de l’entreprise	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	35.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	158
203	48	69	PDF-A7-BOIS-02	Capacité et expérience	Capacité et expérience	Capacité et expérience	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	60.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	146
204	48	69	PDF-A7-BOIS-03	Digitalisation	Maturité numérique	Maturité numérique	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	5.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	142
205	49	70	PDF-A6-ALU-01	Appréciation de l’entreprise	Appréciation de l’entreprise	Appréciation de l’entreprise	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	35.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	150
210	50	71	PDF-A5-ASC-03	Méthodes et outils	Méthodes et outils	Méthodes et outils	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	5.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	138
211	51	72	PDF-A3-ELEC-01	Appréciation de l’entreprise	Appréciation de l’entreprise	Appréciation de l’entreprise	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	35.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	145
212	51	72	PDF-A3-ELEC-02	Capacité et expérience	Capacité et expérience globale	Capacité et expérience globale	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	60.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	136
234	61	82	TEST-WF-01	Expérience	Expérience sur des projets similaires	Présentez vos principales expériences similaires.	Décrire au moins deux projets.	Vérifier la pertinence des références.	Réponse descriptive et références attendues.	Conforme = points maximum ; non conforme = 0.	40.00	Conforme = 40 ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-08-06 13:53:19.201418	2026-08-06 13:53:19.201418	176
235	61	82	TEST-WF-02	Moyens	Moyens humains et techniques	Décrivez l’équipe et les moyens disponibles.	Indiquer les profils clés et les outils.	Vérifier l’adéquation des ressources.	Organigramme et description attendus.	Conforme = points maximum ; non conforme = 0.	35.00	Conforme = 35 ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-08-06 13:53:19.201418	2026-08-06 13:53:19.201418	176
236	61	82	TEST-WF-03	Qualité	Organisation qualité et méthodologie	Présentez votre méthodologie et votre dispositif qualité.	Décrire les contrôles internes prévus.	Vérifier la cohérence de la méthodologie.	Méthodologie structurée attendue.	Conforme = points maximum ; non conforme = 0.	25.00	Conforme = 25 ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-08-06 13:53:19.201418	2026-08-06 13:53:19.201418	176
213	51	72	PDF-A3-ELEC-03	BIM	Maturité BIM	Maturité BIM	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	5.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	161
179	41	62	PDF-D4-OPC-01	Appréciation du bureau	Appréciation du bureau	Appréciation du bureau	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	30.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	f	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	131
197	46	67	PDF-A9-JARD-02	Capacité et expérience	Capacité et expérience	Capacité et expérience	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	50.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	165
214	52	73	PDF-A2-FLU-01	Appréciation de l’entreprise	Appréciation de l’entreprise	Appréciation de l’entreprise	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	35.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	162
215	52	73	PDF-A2-FLU-02	Capacité et expérience	Capacité et expérience globale	Capacité et expérience globale	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	60.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	174
216	52	73	PDF-A2-FLU-03	BIM	Maturité BIM	Maturité BIM	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	5.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	139
220	54	75	PDF-T7-DIV-01	Évaluation technique et décorative	Fournitures diverses	Fournitures diverses	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	100.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-08-03 11:50:32.562175	169
\.


--
-- Data for Name: critere_piece; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.critere_piece (id, critere_evaluation_id, code_piece, nom_piece, raison_piece, note_candidat, note_evaluateur, format_accepte, obligatoire, condition_reponse, ordre_affichage, actif, created_at, updated_at) FROM stdin;
185	213	JUSTIF-PDF-A3-ELEC-03	Références BIM, licences, CV BIM et justificatifs associés	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
186	179	JUSTIF-PDF-D4-OPC-01	Dossier de présentation, organigramme, CV et références du bureau	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
188	181	JUSTIF-PDF-D4-OPC-03	Pièce justificative du critère	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
189	182	JUSTIF-PDF-D3-BET-01	Dossier de présentation, organigramme, CV et références du bureau	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
191	184	JUSTIF-PDF-D3-BET-03	Références BIM, licences, CV BIM et justificatifs associés	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
192	185	JUSTIF-PDF-D2-STR-01	Dossier de présentation, organigramme, CV et références du bureau	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
194	187	JUSTIF-PDF-D2-STR-03	Références BIM, licences, CV BIM et justificatifs associés	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
195	188	JUSTIF-PDF-D1-IDEE-01	Certificats qualité, HSE, garanties et documents de maintenance	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
196	189	JUSTIF-PDF-D1-IDEE-02	Pièce justificative du critère	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
197	190	JUSTIF-PDF-D1-IDEE-03	Pièce justificative du critère	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
198	191	JUSTIF-PDF-D1-IDEE-04	Fiches techniques, catalogues, certificats, garanties et références	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
199	192	JUSTIF-PDF-D1-IDEE-05	Pièce justificative du critère	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
200	193	JUSTIF-PDF-D1-ARCH-01	Dossier de présentation, organigramme, CV et références du bureau	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
202	195	JUSTIF-PDF-D1-ARCH-03	Références BIM, licences, CV BIM et justificatifs associés	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
203	196	JUSTIF-PDF-A9-JARD-01	Organigramme, moyens humains, moyens matériels et procédures	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
204	197	JUSTIF-PDF-A9-JARD-02	Références, attestations maître d’ouvrage et fiches projets	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
205	198	JUSTIF-PDF-A9-JARD-03	Certificats qualité, HSE, garanties et documents de maintenance	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
206	199	JUSTIF-PDF-A8-CUIS-01	Dossier de présentation, organigramme, CV et références de l’entreprise	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
207	200	JUSTIF-PDF-A8-CUIS-02	Références, attestations maître d’ouvrage et fiches projets	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
208	201	JUSTIF-PDF-A8-CUIS-03	Justificatifs outils numériques, logiciels, captures ou références	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
209	202	JUSTIF-PDF-A7-BOIS-01	Dossier de présentation, organigramme, CV et références de l’entreprise	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
210	203	JUSTIF-PDF-A7-BOIS-02	Références, attestations maître d’ouvrage et fiches projets	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
211	204	JUSTIF-PDF-A7-BOIS-03	Justificatifs outils numériques, logiciels, captures ou références	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
212	205	JUSTIF-PDF-A6-ALU-01	Dossier de présentation, organigramme, CV et références de l’entreprise	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
213	206	JUSTIF-PDF-A6-ALU-02	Références, attestations maître d’ouvrage et fiches projets	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
214	207	JUSTIF-PDF-A6-ALU-03	Justificatifs outils numériques, logiciels, captures ou références	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
215	208	JUSTIF-PDF-A5-ASC-01	Organigramme, moyens humains, moyens matériels et procédures	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
216	209	JUSTIF-PDF-A5-ASC-02	Références, attestations maître d’ouvrage et fiches projets	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
217	210	JUSTIF-PDF-A5-ASC-03	Pièce justificative du critère	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
218	211	JUSTIF-PDF-A3-ELEC-01	Dossier de présentation, organigramme, CV et références de l’entreprise	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
219	212	JUSTIF-PDF-A3-ELEC-02	Références, attestations maître d’ouvrage et fiches projets	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
220	214	JUSTIF-PDF-A2-FLU-01	Dossier de présentation, organigramme, CV et références de l’entreprise	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
221	215	JUSTIF-PDF-A2-FLU-02	Références, attestations maître d’ouvrage et fiches projets	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
222	216	JUSTIF-PDF-A2-FLU-03	Références BIM, licences, CV BIM et justificatifs associés	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
226	220	JUSTIF-PDF-T7-DIV-01	Fiches techniques, catalogues, certificats, garanties et références	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
227	221	JUSTIF-PDF-T6-ECL-01	Fiches techniques, catalogues, certificats, garanties et références	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
228	222	JUSTIF-PDF-T5-PORTES-01	Fiches techniques, catalogues, certificats, garanties et références	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
229	223	JUSTIF-PDF-T4-ELEC-01	Fiches techniques, catalogues, certificats, garanties et références	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
230	224	JUSTIF-PDF-T3-SAN-01	Fiches techniques, catalogues, certificats, garanties et références	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
231	225	JUSTIF-PDF-T2-SOL-01	Fiches techniques, catalogues, certificats, garanties et références	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
232	226	JUSTIF-PDF-T1-TECH-01	Organigramme, moyens humains, moyens matériels et procédures	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
233	227	JUSTIF-PDF-T1-TECH-02	Références, attestations, moyens techniques et certificats	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
234	228	JUSTIF-PDF-T1-TECH-03	Pièce justificative du critère	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
\.


--
-- Data for Name: evaluation_critere; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evaluation_critere (id, reponse_critere_id, evaluateur_id, note_obtenue, commentaire_evaluateur, statut, created_at, updated_at) FROM stdin;
2	33	23	50.00	\N	CONFORME	2026-08-05 19:19:36.273638	2026-08-05 19:19:36.273638
3	34	23	20.00	\N	CONFORME	2026-08-05 19:19:51.857044	2026-08-05 19:19:51.857044
4	32	23	30.00	\N	CONFORME	2026-08-05 19:19:59.151082	2026-08-05 19:19:59.151082
5	35	34	40.00	\N	CONFORME	2026-08-07 09:57:28.321554	2026-08-07 09:57:28.321554
6	36	34	0.00	\N	NON_CONFORME	2026-08-07 09:57:33.360296	2026-08-07 09:57:33.360296
7	37	34	0.00	\N	NON_CONFORME	2026-08-07 09:57:35.937587	2026-08-07 09:57:35.937587
\.


--
-- Data for Name: evaluation_element_lock; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evaluation_element_lock (id, candidature_id, application_candidature_id, element_type, element_key, verrouille_par_id, verrouille_le, actif, deverrouille_par_id, deverrouille_le, motif_deverrouillage) FROM stdin;
1	15	20	CRITERE	32	23	2026-08-05 19:19:59.151082	t	\N	\N	\N
2	15	20	CRITERE	33	23	2026-08-05 19:19:36.273638	t	\N	\N	\N
3	15	20	CRITERE	34	23	2026-08-05 19:19:51.857044	t	\N	\N	\N
4	15	\N	SOLVABILITE	15	23	2026-08-05 19:31:09.406471	t	\N	\N	\N
5	15	\N	DOCUMENTS	15	23	2026-08-05 19:31:17.418357	t	\N	\N	\N
6	17	\N	SOLVABILITE	17	33	2026-08-06 14:50:06.30951	t	\N	\N	\N
7	17	\N	DOCUMENTS	17	33	2026-08-06 14:50:11.841355	t	\N	\N	\N
8	17	21	CRITERE	35	34	2026-08-07 09:57:28.321554	t	\N	\N	\N
9	17	21	CRITERE	36	34	2026-08-07 09:57:33.360296	t	\N	\N	\N
10	17	21	CRITERE	37	34	2026-08-07 09:57:35.937587	t	\N	\N	\N
11	17	21	ZONE_REFERENCE	6	35	2026-08-07 10:02:32.280076	t	\N	\N	\N
12	17	21	ZONE_REFERENCE	5	35	2026-08-07 10:02:33.807781	t	\N	\N	\N
13	17	21	DECISION	21	28	2026-08-07 10:35:31.71473	t	\N	\N	\N
14	17	21	LOT	21	28	2026-08-07 10:35:31.71473	f	\N	2026-08-13 13:03:36.167652	Migration workflow global : suppression du verrou LOT hérité.
\.


--
-- Data for Name: grille_evaluation_lot; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.grille_evaluation_lot (id, lot_id, code_grille, nom_grille, description, total_points, seuil_admission, actif, created_at, updated_at) FROM stdin;
41	62	GRILLE-D4_OPC	Grille - Bureau de pilotage / OPC	Grille issue du PDF officiel. Total 100 points. Seuil d’admission 80/100.	100.00	80.00	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
42	63	GRILLE-D3_BET	Grille - Étude fluides et électricité	Grille issue du PDF officiel. Total 100 points. Seuil d’admission 80/100.	100.00	80.00	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
43	64	GRILLE-D2_STRUCTURE	Grille - Étude structurelle	Grille issue du PDF officiel. Total 100 points. Seuil d’admission 80/100.	100.00	80.00	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
44	65	GRILLE-D1_IDEES	Grille - Concours d’idées architecturales	Grille issue du PDF officiel. Total 100 points. Seuil d’admission 80/100.	100.00	80.00	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
45	66	GRILLE-D1_ARCH	Grille - Étude architecturale	Grille issue du PDF officiel. Total 100 points. Seuil d’admission 80/100.	100.00	80.00	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
46	67	GRILLE-A9_JARDINS	Grille - Aménagement des jardins	Grille issue du PDF officiel. Total 100 points. Seuil d’admission 80/100.	100.00	80.00	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
47	68	GRILLE-A8_CUISINES	Grille - Fourniture et pose des cuisines	Grille issue du PDF officiel. Total 100 points. Seuil d’admission 80/100.	100.00	80.00	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
48	69	GRILLE-A7_BOIS	Grille - Menuiserie bois	Grille issue du PDF officiel. Total 100 points. Seuil d’admission 80/100.	100.00	80.00	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
49	70	GRILLE-A6_ALU	Grille - Menuiserie aluminium	Grille issue du PDF officiel. Total 100 points. Seuil d’admission 80/100.	100.00	80.00	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
50	71	GRILLE-A5_ASCENSEURS	Grille - Ascenseurs	Grille issue du PDF officiel. Total 100 points. Seuil d’admission 80/100.	100.00	80.00	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
51	72	GRILLE-A3_ELEC	Grille - Réseaux électriques GTB/CFA/CFO	Grille issue du PDF officiel. Total 100 points. Seuil d’admission 80/100.	100.00	80.00	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
52	73	GRILLE-A2_FLUIDES	Grille - Réseaux fluides / plomberie / CVC	Grille issue du PDF officiel. Total 100 points. Seuil d’admission 80/100.	100.00	80.00	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
54	75	GRILLE-T7_DIVERS	Grille - Fournitures diverses	Grille issue du PDF officiel. Total 100 points. Seuil d’admission 80/100.	100.00	80.00	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
55	76	GRILLE-T6_ECLAIRAGE	Grille - Éclairage et lustres	Grille issue du PDF officiel. Total 100 points. Seuil d’admission 80/100.	100.00	80.00	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
56	77	GRILLE-T5_PORTES	Grille - Portes intérieures et blindées	Grille issue du PDF officiel. Total 100 points. Seuil d’admission 80/100.	100.00	80.00	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
57	78	GRILLE-T4_ELECTRO	Grille - Appareils électroménagers	Grille issue du PDF officiel. Total 100 points. Seuil d’admission 80/100.	100.00	80.00	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
58	79	GRILLE-T3_SANITAIRE	Grille - Sanitaires et robinetterie	Grille issue du PDF officiel. Total 100 points. Seuil d’admission 80/100.	100.00	80.00	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
59	80	GRILLE-T2_SOL_MARBRE	Grille - Revêtements de sol et marbre	Grille issue du PDF officiel. Total 100 points. Seuil d’admission 80/100.	100.00	80.00	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
60	81	GRILLE-T1_TECH	Grille - Fournisseurs techniques	Grille issue du PDF officiel. Total 100 points. Seuil d’admission 80/100.	100.00	80.00	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
61	82	TEST_WF_GRID	Grille de test — Cycle qualification	Grille de 100 points pour le test du workflow.	100.00	80.00	t	2026-08-06 13:53:19.201418	2026-08-06 13:53:19.201418
\.


--
-- Data for Name: historique_action; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.historique_action (id, utilisateur_id, candidature_id, application_candidature_id, action, description, date_action) FROM stdin;
107	26	15	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-08-03 12:08:15.052493
108	26	15	\N	MODIFICATION_INFOS_SOCIETE	Le candidat a modifié les informations générales de la société. Ancien: Raison sociale: Elite, Email: -, Téléphone: - | Nouveau: Raison sociale: Elite, Email: oumeyma.tibaoui@esprit.tn, Téléphone: 71456789	2026-08-03 12:09:31.775354
109	26	15	\N	UPLOAD_RNE	Le candidat a déposé ou modifié le fichier RNE. Ancien fichier: - | Nouveau fichier: testt.pdf	2026-08-03 12:09:31.851922
110	26	15	\N	UPLOAD_CNSS	Le candidat a déposé ou modifié le fichier CNSS. Ancien fichier: - | Nouveau fichier: testt.pdf	2026-08-03 12:09:31.876199
111	26	15	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-08-03 12:09:31.891477
112	26	15	\N	SOUMISSION_CANDIDATURE	Le candidat a soumis définitivement sa candidature. Nombre de lots soumis: 1	2026-08-03 12:11:15.606684
122	23	\N	\N	EL_EMAR_CREATE_UTILISATEUR	Création du compte interne : comite@elemar.com | Nom : Administrateurr | Rôle : Evaluateur (EVALUATEUR) | Nouvel utilisateur ID : 28	2026-08-04 10:22:57.086626
132	23	15	\N	WORKFLOW_INITIALISE	Workflow El Emar initialisé avec 3 étape(s). Première étape : Contrôle administratif	2026-08-06 12:38:57.195861
143	33	17	\N	EL_EMAR_CONTROLE_DOCUMENTS	Contrôle des pièces générales | RNE : CONFORME | CNSS : CONFORME	2026-08-06 14:50:11.841355
146	33	17	\N	WORKFLOW_ETAPE_TRANSMISE	Étape terminée : Recevabilité administrative | Étape suivante ouverte : Évaluation technique	2026-08-07 09:56:29.786259
148	34	17	21	EL_EMAR_EVALUATION_CRITERE	Évaluation du critère | Réponse ID : 35 | Statut : CONFORME | Note : 40.00 | Commentaire : -	2026-08-07 09:57:28.321554
149	34	17	21	EL_EMAR_EVALUATION_CRITERE	Évaluation du critère | Réponse ID : 36 | Statut : NON_CONFORME | Note : 0.00 | Commentaire : -	2026-08-07 09:57:33.360296
151	34	17	\N	WORKFLOW_ETAPE_TRANSMISE	Étape terminée : Évaluation technique | Étape suivante ouverte : Décision finale	2026-08-07 09:57:41.562282
153	35	17	21	EL_EMAR_CLASSEMENT_ZONE	Classement zone enregistré | Société : FOURNISSEUR TEST WORKFLOW SARL | Lot : Lot de test — Cycle qualification | Référence ID : 6 | Zone : Zone 1 | Catégorie : A | Commentaire : -	2026-08-07 10:02:32.280076
154	35	17	21	EL_EMAR_CLASSEMENT_ZONE	Classement zone enregistré | Société : FOURNISSEUR TEST WORKFLOW SARL | Lot : Lot de test — Cycle qualification | Référence ID : 5 | Zone : Zone 2 | Catégorie : B | Commentaire : -	2026-08-07 10:02:33.807781
19	\N	\N	\N	TOGGLE_UTILISATEUR	Désactivation du compte utilisateur.	2026-07-12 22:27:31.367107
123	23	\N	\N	UTILISATEUR_INTERNE_CREATE	Création du compte interne : technique@elemar.com | Nom : Administrateurrr | Département : TECHNIQUE | Rôle : Evaluateur (EVALUATEUR) | Nouvel utilisateur ID : 29	2026-08-04 10:58:39.933708
133	23	15	\N	WORKFLOW_CONFIGURATION_MODIFIEE	Configuration du workflow remplacée. Nombre d'étapes : 3	2026-08-06 13:32:15.43398
145	33	17	\N	WORKFLOW_ETAPE_DEMARREE	Étape démarrée : Recevabilité administrative	2026-08-07 09:47:03.278307
147	34	17	\N	WORKFLOW_ETAPE_DEMARREE	Étape démarrée : Évaluation technique	2026-08-07 09:57:21.048749
152	35	17	\N	WORKFLOW_ETAPE_DEMARREE	Étape démarrée : Décision finale	2026-08-07 10:02:19.639976
155	35	17	\N	WORKFLOW_ETAPE_TRANSMISE	Étape terminée : Décision finale | Étape suivante ouverte : Classement par zone	2026-08-07 10:02:36.986948
60	\N	\N	\N	EL_EMAR_TOGGLE_UTILISATEUR	Désactivation du compte utilisateur interne.	2026-07-22 11:45:45.401678
63	\N	\N	\N	EL_EMAR_TOGGLE_UTILISATEUR	Activation du compte utilisateur interne.	2026-07-22 11:45:51.046844
65	\N	\N	\N	EL_EMAR_TOGGLE_UTILISATEUR	Désactivation du compte utilisateur interne.	2026-07-23 10:45:59.349579
66	\N	\N	\N	EL_EMAR_TOGGLE_UTILISATEUR	Activation du compte utilisateur interne.	2026-07-23 10:46:02.730135
67	\N	\N	\N	EL_EMAR_TOGGLE_UTILISATEUR	Désactivation du compte utilisateur interne.	2026-07-23 10:46:06.053446
57	\N	\N	\N	EL_EMAR_CREATE_UTILISATEUR	Création du compte interne : itaf@gmail.com | Nom : itaf | Rôle : Évaluateur (EVALUATEUR) | Nouvel utilisateur ID : 20	2026-07-22 10:53:31.411768
58	\N	\N	\N	EL_EMAR_CREATE_UTILISATEUR	Création du compte interne : samira@elemar.com | Nom : test | Rôle : Administrateur (ADMIN) | Nouvel utilisateur ID : 21	2026-07-22 11:45:34.031238
59	\N	\N	\N	EL_EMAR_TOGGLE_UTILISATEUR	Désactivation du compte utilisateur interne.	2026-07-22 11:45:40.64328
61	\N	\N	\N	EL_EMAR_TOGGLE_UTILISATEUR	Désactivation du compte utilisateur interne.	2026-07-22 11:45:48.958199
62	\N	\N	\N	EL_EMAR_TOGGLE_UTILISATEUR	Activation du compte utilisateur interne.	2026-07-22 11:45:50.213677
64	\N	\N	\N	EL_EMAR_TOGGLE_UTILISATEUR	Activation du compte utilisateur interne.	2026-07-22 11:45:51.648701
68	\N	\N	\N	EL_EMAR_TOGGLE_UTILISATEUR	Activation du compte utilisateur interne.	2026-07-23 10:46:08.506687
69	\N	\N	\N	EL_EMAR_TOGGLE_UTILISATEUR	Désactivation du compte utilisateur interne.	2026-07-23 10:49:54.03418
70	\N	\N	\N	EL_EMAR_TOGGLE_UTILISATEUR	Activation du compte utilisateur interne.	2026-07-23 10:49:54.931909
124	23	\N	\N	UTILISATEUR_INTERNE_UPDATE	Modification du compte utilisateur ID 28 | Ancien nom : Administrateurr | Nouveau nom : comité | Ancien email : comite@elemar.com | Nouvel email : comite@elemar.com | Nouveau rôle : Evaluateur (EVALUATEUR)	2026-08-04 12:01:34.386173
125	23	\N	\N	UTILISATEUR_INTERNE_UPDATE	Modification du compte utilisateur ID 29 | Ancien nom : Administrateurrr | Nouveau nom : technique | Ancien email : technique@elemar.com | Nouvel email : technique@elemar.com | Nouveau rôle : Evaluateur (EVALUATEUR)	2026-08-04 12:01:46.156908
134	31	16	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-08-06 13:47:40.813491
137	23	\N	\N	UTILISATEUR_INTERNE_UPDATE	Modification du compte utilisateur ID 29 | Ancien nom : technique | Nouveau nom : technique | Ancien email : technique@elemar.com | Nouvel email : technique@elemar.com | Nouveau rôle : Administrateur (ADMIN)	2026-08-06 13:49:00.148503
150	34	17	21	EL_EMAR_EVALUATION_CRITERE	Évaluation du critère | Réponse ID : 37 | Statut : NON_CONFORME | Note : 0.00 | Commentaire : -	2026-08-07 09:57:35.937587
126	26	15	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-08-04 14:12:55.287788
135	23	\N	\N	UTILISATEUR_INTERNE_UPDATE	Modification du compte utilisateur ID 27 | Ancien nom : Achat | Nouveau nom : Achat | Ancien email : contact@atlas-ingenierie.tn | Nouvel email : contact@atlas-ingenierie.tn | Nouveau rôle : Administrateur (ADMIN)	2026-08-06 13:48:36.262475
136	23	\N	\N	UTILISATEUR_INTERNE_UPDATE	Modification du compte utilisateur ID 28 | Ancien nom : comité | Nouveau nom : comité | Ancien email : comite@elemar.com | Nouvel email : comite@elemar.com | Nouveau rôle : Administrateur (ADMIN)	2026-08-06 13:48:45.843861
138	23	\N	\N	UTILISATEUR_INTERNE_UPDATE	Modification du compte utilisateur ID 23 | Ancien nom : Administrateurrr | Nouveau nom : Administrateurr | Ancien email : admin@elemar.com | Nouvel email : admin@elemar.com | Nouveau rôle : Administrateur (ADMIN)	2026-08-06 13:49:43.653135
139	23	\N	\N	UTILISATEUR_INTERNE_UPDATE	Modification du compte utilisateur ID 23 | Ancien nom : Administrateurr | Nouveau nom : Administrateurr | Ancien email : admin@elemar.com | Nouvel email : admin@elemar.com | Nouveau rôle : Administrateur (ADMIN)	2026-08-06 13:57:20.652026
140	23	\N	\N	UTILISATEUR_INTERNE_UPDATE	Modification du compte utilisateur ID 27 | Ancien nom : Achat | Nouveau nom : GESTIONNAIRE | Ancien email : contact@atlas-ingenierie.tn | Nouvel email : gestionnaireee.workflow@test.elemar.local | Nouveau rôle : Gestionnaire qualification (GESTIONNAIRE)	2026-08-06 13:59:40.547141
156	23	17	\N	WORKFLOW_ETAPE_REAFFECTEE	Étape réaffectée : Classement par zone | Ancien utilisateur ID : 33 | Nouvel utilisateur : comité | Motif : c'est pas men responsabilité	2026-08-07 10:30:33.203857
157	28	17	\N	WORKFLOW_ETAPE_DEMARREE	Étape démarrée : Classement par zone	2026-08-07 10:31:25.821222
159	28	17	21	EL_EMAR_DECISION_FINALE_LOT	El Emar a enregistré la décision finale du lot. | Candidature : FOURNISSEUR TEST WORKFLOW SARL | Lot : Lot de test — Cycle qualification | Décision : REJETE | Observation : <80	2026-08-07 10:35:31.71473
117	23	\N	\N	EL_EMAR_UPDATE_UTILISATEUR	Modification du compte utilisateur ID 23 | Ancien nom : Administrateur | Nouveau nom : Administrateurrr | Ancien email : admin@elemar.com | Nouvel email : admin@elemar.com | Nouveau rôle ID : 10	2026-08-03 21:41:38.105065
118	23	\N	\N	EL_EMAR_UPDATE_UTILISATEUR	Modification du compte utilisateur ID 23 | Ancien nom : Administrateurrr | Nouveau nom : Administrateurrr | Ancien email : admin@elemar.com | Nouvel email : admin@elemar.com | Nouveau rôle ID : 10	2026-08-03 21:46:58.282949
119	23	\N	\N	EL_EMAR_UPDATE_UTILISATEUR	Modification du compte utilisateur ID 23 | Ancien nom : Administrateurrr | Nouveau nom : Administrateurrr | Ancien email : admin@elemar.com | Nouvel email : admin@elemar.com | Nouveau rôle ID : 10	2026-08-03 21:47:07.99357
121	23	\N	\N	EL_EMAR_CREATE_UTILISATEUR	Création du compte interne : contact@atlas-ingenierie.tn | Nom : Achat | Rôle : Evaluateur (EVALUATEUR) | Nouvel utilisateur ID : 27	2026-08-03 21:48:06.670896
127	23	15	20	EL_EMAR_EVALUATION_CRITERE	Évaluation du critère | Réponse ID : 33 | Statut : CONFORME | Note : 50.00 | Commentaire : -	2026-08-05 19:19:36.273638
130	23	15	\N	EL_EMAR_SOLVABILITE	El Emar a mis à jour la solvabilité. | Statut : SOLVABLE | Commentaire : -	2026-08-05 19:31:09.404321
141	23	\N	\N	UTILISATEUR_INTERNE_UPDATE	Modification du compte utilisateur ID 29 | Ancien nom : technique | Nouveau nom : technique | Ancien email : technique@elemar.com | Nouvel email : technique@elemar.com | Nouveau rôle : Décideur agrément (DECIDEUR)	2026-08-06 14:15:16.848123
158	23	\N	\N	UTILISATEUR_INTERNE_UPDATE	Modification du compte utilisateur ID 28 | Ancien nom : comité | Nouveau nom : comité | Ancien email : comite@elemar.com | Nouvel email : comite@elemar.com | Nouveau rôle : Décideur agrément (DECIDEUR)	2026-08-07 10:34:41.568832
160	23	\N	\N	UTILISATEUR_INTERNE_CREATE	Création du compte interne : nahla@elamar.com | Nom : Nahla | Département : ACHAT | Rôle : Administrateur (ADMIN) | Nouvel utilisateur ID : 38	2026-08-07 10:44:52.56674
15	\N	\N	\N	EL_EMAR_UPDATE_COMPTE	El Emar a modifié son compte. Ancien nom: Administrateur | Nouveau nom: Administrateur | Ancienne fonction: - | Nouvelle fonction: administrateur	2026-07-12 21:26:45.679315
26	\N	\N	\N	UPDATE_ROLE_UTILISATEUR	Modification du rôle utilisateur. Nouveau rôle : CND	2026-07-13 09:46:31.471306
34	\N	9	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-13 11:08:11.25342
35	\N	\N	\N	EL_EMAR_CREATE_UTILISATEUR	Création du compte interne El Emar : mounira@elemar.com | Nom : mounira | Rôle : DA | Nouvel utilisateur ID : 16	2026-07-13 11:09:10.695005
36	\N	9	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-13 11:13:53.812441
37	\N	\N	\N	EL_EMAR_CREATE_UTILISATEUR	Création du compte interne El Emar : samira@elemar.com | Nom : samira | Rôle : IT | Nouvel utilisateur ID : 17	2026-07-13 11:14:25.418878
38	\N	9	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-13 11:17:04.89037
39	\N	9	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-13 11:17:05.821175
40	\N	\N	\N	EL_EMAR_CREATE_UTILISATEUR	Création du compte interne El Emar : moaz@elemar.com | Nom : moaz | Rôle : IT | Nouvel utilisateur ID : 18	2026-07-13 11:17:31.870471
41	\N	9	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-13 11:23:14.518566
42	\N	9	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-13 11:23:35.784703
43	\N	\N	\N	EL_EMAR_CREATE_UTILISATEUR	Création du compte interne El Emar : lobna@gmail.com | Nom : lobna | Rôle : ADMIN | Nouvel utilisateur ID : 19	2026-07-13 11:25:47.81792
120	23	\N	\N	EL_EMAR_UPDATE_UTILISATEUR	Modification du compte utilisateur ID 23 | Ancien nom : Administrateurrr | Nouveau nom : Administrateurrr | Ancien email : admin@elemar.com | Nouvel email : admin@elemar.com | Nouveau rôle ID : 10	2026-08-03 21:47:22.481671
128	23	15	20	EL_EMAR_EVALUATION_CRITERE	Évaluation du critère | Réponse ID : 34 | Statut : CONFORME | Note : 20.00 | Commentaire : -	2026-08-05 19:19:51.857044
129	23	15	20	EL_EMAR_EVALUATION_CRITERE	Évaluation du critère | Réponse ID : 32 | Statut : CONFORME | Note : 30.00 | Commentaire : -	2026-08-05 19:19:59.151082
131	23	15	\N	EL_EMAR_CONTROLE_DOCUMENTS	Contrôle des pièces générales | RNE : CONFORME | CNSS : CONFORME	2026-08-05 19:31:17.418357
142	33	17	\N	EL_EMAR_SOLVABILITE	El Emar a mis à jour la solvabilité. | Statut : SOLVABLE | Commentaire : bienn	2026-08-06 14:50:06.30951
144	23	17	\N	WORKFLOW_ETAPE_REAFFECTEE	Étape réaffectée : Évaluation technique | Ancien utilisateur ID : 34 | Nouvel utilisateur : Évaluateur Technique Test | Motif : -	2026-08-06 14:55:50.188008
161	23	15	\N	WORKFLOW_INITIALISE_AUTO	Workflow créé automatiquement depuis le modèle global. Première étape : Recevabilité administrative	2026-08-13 15:53:40.776209
87	\N	9	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-29 10:59:18.971102
88	\N	9	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-29 11:22:54.029111
89	\N	\N	\N	EL_EMAR_CREATE_UTILISATEUR	Création du compte interne : evall@gmail.com | Nom : Evall | Rôle : Évaluateur (EVALUATEUR) | Nouvel utilisateur ID : 22	2026-07-29 11:33:46.00472
92	\N	9	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-29 13:22:40.828921
93	\N	9	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-29 13:24:09.542087
94	\N	9	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-29 13:24:20.783548
100	\N	9	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-30 08:53:40.318028
102	\N	\N	\N	EL_EMAR_DELETE_UTILISATEUR	Suppression du compte utilisateur : el.emar@example.com | ID supprimé : 1	2026-07-30 08:54:28.862217
103	\N	\N	\N	EL_EMAR_DELETE_UTILISATEUR	Suppression du compte utilisateur : admin@elemar.tn | ID supprimé : 3	2026-07-30 08:54:32.187676
104	\N	\N	\N	EL_EMAR_DELETE_UTILISATEUR	Suppression du compte utilisateur : oumeimatibaoui@gmail.com | ID supprimé : 17	2026-07-30 08:54:48.092386
105	\N	\N	\N	EL_EMAR_DELETE_UTILISATEUR	Suppression du compte utilisateur : mounira@elemar.com | ID supprimé : 16	2026-07-30 08:54:52.750046
106	\N	\N	\N	EL_EMAR_DELETE_UTILISATEUR	Suppression du compte utilisateur : itaf@gmail.com | ID supprimé : 20	2026-07-30 08:55:00.679737
\.


--
-- Data for Name: lot; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lot (id, code_lot, nom_lot, description, actif, created_at, type_intervenant_id, updated_at) FROM stdin;
67	A9_JARDINS	Aménagement des jardins	Grille d’évaluation des travaux d’aménagement des jardins.	t	2026-07-10 09:12:59.70308	13	2026-07-27 11:24:15.519826
82	TEST_WF_LOT	Lot de test — Cycle qualification	Lot isolé pour tester le workflow utilisateur par utilisateur.	t	2026-08-06 13:53:19.201418	15	2026-08-06 13:53:19.201418
62	D4_OPC	Bureau de pilotage / OPC	Grille d’évaluation des bureaux de pilotage et OPC.	t	2026-07-10 09:12:59.70308	12	2026-07-10 09:12:59.70308
63	D3_BET	Étude fluides et électricité	Grille d’évaluation des études fluides et électricité.	t	2026-07-10 09:12:59.70308	12	2026-07-10 09:12:59.70308
64	D2_STRUCTURE	Étude structurelle	Grille d’évaluation de l’étude structurelle.	t	2026-07-10 09:12:59.70308	12	2026-07-10 09:12:59.70308
65	D1_IDEES	Concours d’idées architecturales	Grille d’évaluation du concours d’idées architecturales.	t	2026-07-10 09:12:59.70308	12	2026-07-10 09:12:59.70308
66	D1_ARCH	Étude architecturale	Grille d’évaluation de l’étude architecturale.	t	2026-07-10 09:12:59.70308	12	2026-07-10 09:12:59.70308
68	A8_CUISINES	Fourniture et pose des cuisines	Grille d’évaluation de la fourniture et pose des cuisines.	t	2026-07-10 09:12:59.70308	13	2026-07-10 09:12:59.70308
69	A7_BOIS	Menuiserie bois	Grille d’évaluation de la menuiserie bois.	t	2026-07-10 09:12:59.70308	13	2026-07-10 09:12:59.70308
70	A6_ALU	Menuiserie aluminium	Grille d’évaluation de la menuiserie aluminium.	t	2026-07-10 09:12:59.70308	13	2026-07-10 09:12:59.70308
71	A5_ASCENSEURS	Ascenseurs	Grille d’évaluation des ascenseurs.	t	2026-07-10 09:12:59.70308	13	2026-07-10 09:12:59.70308
72	A3_ELEC	Réseaux électriques GTB/CFA/CFO	Grille d’évaluation des réseaux électriques GTB/CFA/CFO.	t	2026-07-10 09:12:59.70308	13	2026-07-10 09:12:59.70308
73	A2_FLUIDES	Réseaux fluides / plomberie / CVC	Grille d’évaluation des réseaux fluides, plomberie et CVC.	t	2026-07-10 09:12:59.70308	13	2026-07-10 09:12:59.70308
75	T7_DIVERS	Fournitures diverses	Grille d’évaluation des fournitures diverses.	t	2026-07-10 09:12:59.70308	14	2026-07-10 09:12:59.70308
76	T6_ECLAIRAGE	Éclairage et lustres	Grille d’évaluation de l’éclairage et des lustres.	t	2026-07-10 09:12:59.70308	14	2026-07-10 09:12:59.70308
77	T5_PORTES	Portes intérieures et blindées	Grille d’évaluation des portes intérieures et blindées.	t	2026-07-10 09:12:59.70308	14	2026-07-10 09:12:59.70308
78	T4_ELECTRO	Appareils électroménagers	Grille d’évaluation des appareils électroménagers.	t	2026-07-10 09:12:59.70308	14	2026-07-10 09:12:59.70308
79	T3_SANITAIRE	Sanitaires et robinetterie	Grille d’évaluation des sanitaires et robinetterie.	t	2026-07-10 09:12:59.70308	14	2026-07-10 09:12:59.70308
80	T2_SOL_MARBRE	Revêtements de sol et marbre	Grille d’évaluation des revêtements de sol et marbre.	t	2026-07-10 09:12:59.70308	14	2026-07-10 09:12:59.70308
81	T1_TECH	Fournisseurs techniques	Grille d’évaluation des fournisseurs techniques.	t	2026-07-10 09:12:59.70308	14	2026-07-10 09:12:59.70308
\.


--
-- Data for Name: module_navbar; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.module_navbar (id, code_module, groupe, libelle, description, route_front, icone, ordre_groupe, ordre_module, actif, created_at) FROM stdin;
12	EVALUATIONS	Instruction et décision	Évaluations des intervenants	Consultation et traitement des évaluations des intervenants.	/el-emar/evaluations	ti ti-clipboard-check	2	2	t	2026-06-19 12:39:03.405245
21	EVAL_SECTION_IDENTIFICATION	EVALUATION_SECTIONS	Identification de l’intervenant	Affiche les informations générales de l’intervenant.	\N	ti ti-building	20	1	t	2026-08-03 10:46:21.065584
22	EVAL_SECTION_SOLVABILITE	EVALUATION_SECTIONS	Capacité financière	Affiche la section interne de capacité financière.	\N	ti ti-shield-dollar	20	2	t	2026-08-03 10:46:21.065584
23	EVAL_SECTION_DOCUMENTS_ADMIN	EVALUATION_SECTIONS	Contrôle administratif RNE / CNSS	Affiche le contrôle de conformité du RNE et de la CNSS.	\N	ti ti-files	20	3	t	2026-08-03 10:46:21.065584
24	EVAL_SECTION_LOTS	EVALUATION_SECTIONS	Domaines de l’intervenant	Affiche les domaines sélectionnés par l’intervenant.	\N	ti ti-briefcase	20	4	t	2026-08-03 10:46:21.065584
2	DASHBOARD	Accueil	Tableau de bord	Vue synthétique de vos intervenants, évaluations et actions prioritaires.	/el-emar/dashboard	ti ti-layout-dashboard	1	1	t	2026-06-19 12:39:03.405245
5	INTERVENANTS	Qualification	Intervenants	Consulter et gérer les intervenants enregistrés.	/el-emar/candidats	ti ti-building-community	2	1	t	2026-06-19 12:39:03.405245
1	SESSIONS_QUALIFICATION	Qualification	Campagnes	Planification et suivi des campagnes de qualification.	/el-emar/campagnes	ti ti-calendar-event	2	1	f	2026-06-19 12:39:03.405245
4	DOSSIERS_QUALIFICATION	Qualification	Dossiers	Consultation et suivi des dossiers de qualification.	/el-emar/dossiers	ti ti-folders	2	3	f	2026-06-19 12:39:03.405245
11	VERIFICATION_DOCUMENTS	Qualification	Contrôle des pièces	Vérification des documents déposés par les intervenants.	/el-emar/verification-documents	ti ti-file-check	2	4	f	2026-06-19 12:39:03.405245
13	DECISIONS	Qualification	Décisions	Validation des décisions finales de qualification.	/el-emar/decisions	ti ti-gavel	2	6	f	2026-06-19 12:39:03.405245
25	EVAL_SECTION_GRILLE_TECHNIQUE	EVALUATION_SECTIONS	Grille d’évaluation	Affiche les critères appartenant aux catégories autorisées.	\N	ti ti-list-check	20	5	t	2026-08-03 10:46:21.065584
27	EVAL_SECTION_ZONES	EVALUATION_SECTIONS	Classement par zone	Affiche les informations de classement territorial.	\N	ti ti-map-pin	20	7	t	2026-08-03 10:46:21.065584
3	LISTE_AGREEE	Qualification	Intervenants qualifiés	Consulter la liste finale des intervenants qualifiés.	/el-emar/liste-agreee	ti ti-list-check	2	4	f	2026-06-19 12:39:03.405245
52	TYPES_INTERVENANTS	Paramétrage	Types d’intervenants	Configurer les types d’intervenants disponibles.	/el-emar/types-intervenant	ti ti-users-group	3	1	t	2026-08-04 11:33:50.099511
6	LOTS	Paramétrage	Domaines d’intervention	Configurer les domaines associés aux intervenants.	/el-emar/lots	ti ti-category-2	3	2	t	2026-06-19 12:39:03.405245
7	ZONES	Paramétrage	Zones	Configurer les zones utilisées dans le classement.	/el-emar/zones	ti ti-map-pin	3	3	t	2026-06-19 12:39:03.405245
10	GRILLE_EVALUATION	Paramétrage	Critères d’évaluation	Configurer les catégories, critères, notes et pièces associées.	/el-emar/criteres	ti ti-adjustments-check	3	5	t	2026-06-19 12:39:03.405245
16	ROLES_ACCES	Administration	Rôles et accès	Configurer les rôles, modules et autorisations.	/el-emar/roles-acces	ti ti-shield-lock	4	1	t	2026-06-19 12:39:03.405245
17	HISTORIQUE	Administration	Historique	Consulter la traçabilité des actions réalisées.	/el-emar/historique	ti ti-history	4	2	t	2026-06-19 12:39:03.405245
18	NOTIFICATIONS	Administration	Notifications	Consultation du centre de notifications.	/el-emar/notifications	ti ti-bell	4	3	t	2026-06-19 12:39:03.405245
8	DOCUMENTS_DEMANDES	Paramétrage	Pièces demandées	Configurer les pièces demandées pour chaque évaluation.	/el-emar/documents-demandes	ti ti-files	3	4	f	2026-06-19 12:39:03.405245
15	UTILISATEURS	Administration	Utilisateurs	Gérer les utilisateurs internes et leurs départements.	/el-emar/Admin	ti ti-users	4	1	t	2026-06-19 12:39:03.405245
9	CHAMPS_APPRECIATION	Paramétrage	Champs du dossier	Configuration des informations demandées.	/el-emar/champs-appreciation	ti ti-forms	3	4	f	2026-06-19 12:39:03.405245
82	WORKFLOW_CONFIGURATION	ADMINISTRATION	Configuration du workflow	Configurer les étapes, leur ordre et les utilisateurs responsables.	/el-emar/workflow-configuration	ti ti-route	3	3	t	2026-08-06 12:14:52.419508
14	CLASSEMENT_ZONE	Qualification	Classement par zone	Classer les intervenants évalués selon les zones.	/el-emar/classement-zone	ti ti-map-check	2	3	t	2026-06-19 12:39:03.405245
51	INTERVENANTS_QUALIFIES	Qualification	Intervenants qualifiés	Consulter la liste finale des intervenants qualifiés.	/el-emar/liste-agreee	ti ti-list-check	2	4	t	2026-08-04 11:33:50.099511
26	EVAL_SECTION_REFERENCES	EVALUATION_SECTIONS	Références professionnelles	Affiche les références professionnelles de l’intervenant.	\N	ti ti-building-community	20	6	t	2026-08-03 10:46:21.065584
28	EVAL_SECTION_DECISION_FINALE	EVALUATION_SECTIONS	Décision finale	Affiche la décision finale par domaine.	\N	ti ti-gavel	20	8	t	2026-08-03 10:46:21.065584
76	EVAL_ACTION_VALIDER_SOLVABILITE	EVALUATION_ACTIONS	Enregistrer la solvabilité	Autorise l’enregistrement définitif de la capacité financière.		ti ti-shield-check	91	10	t	2026-08-04 13:32:24.960615
77	EVAL_ACTION_MODIFIER_RNE_CNSS	EVALUATION_ACTIONS	Contrôler RNE et CNSS	Autorise l’enregistrement définitif du contrôle administratif.		ti ti-files	91	20	t	2026-08-04 13:32:24.960615
78	EVAL_ACTION_NOTER_CRITERE	EVALUATION_ACTIONS	Évaluer un critère	Autorise l’enregistrement définitif des critères autorisés.		ti ti-clipboard-check	91	30	t	2026-08-04 13:32:24.960615
79	EVAL_ACTION_DEMANDER_COMPLEMENT	EVALUATION_ACTIONS	Demander un complément	Autorise l’envoi d’une demande de complément au candidat.		ti ti-message-forward	91	40	t	2026-08-04 13:32:24.960615
80	EVAL_ACTION_AFFECTER_ZONE	EVALUATION_ACTIONS	Affecter une zone	Autorise l’enregistrement définitif de la zone d’une référence.		ti ti-map-pin	91	50	t	2026-08-04 13:32:24.960615
81	EVAL_ACTION_VALIDER_DECISION	EVALUATION_ACTIONS	Enregistrer la décision finale	Autorise la décision finale d’un domaine et son verrouillage.		ti ti-gavel	91	60	t	2026-08-04 13:32:24.960615
83	WORKFLOW_SUPPRIMER	WORKFLOW	Supprimer une configuration	Supprimer un circuit uniquement avant son démarrage.		ti ti-trash	92	40	t	2026-08-06 12:14:52.419508
84	WORKFLOW_REOPEN_STEP	WORKFLOW	Réouvrir une étape	Réouvrir une étape terminée avec un motif.		ti ti-lock-open	92	60	t	2026-08-06 12:14:52.419508
85	WORKFLOW_REASSIGN_USER	WORKFLOW	Réaffecter une étape	Remplacer l’utilisateur responsable d’une étape.		ti ti-user-share	92	50	t	2026-08-06 12:14:52.419508
86	WORKFLOW_VIEW_ALL	WORKFLOW	Voir tous les workflows	Consulter les circuits de tous les dossiers.		ti ti-eye	92	10	t	2026-08-06 12:14:52.419508
87	EVAL_ACTION_VOIR_NOTE	EVALUATION_ACTIONS	Voir les notes	Affiche les notes des critères, des domaines et la note globale.		ti ti-eye	91	70	t	2026-08-06 12:14:52.419508
88	WORKFLOW_INITIALISER	WORKFLOW	Initialiser un workflow	Créer le premier circuit d’un dossier.		ti ti-player-play	92	20	t	2026-08-06 12:14:52.419508
89	WORKFLOW_CONFIGURER	WORKFLOW	Modifier la configuration	Ajouter, déplacer ou supprimer des étapes avant le démarrage.		ti ti-adjustments	92	30	t	2026-08-06 12:14:52.419508
\.


--
-- Data for Name: notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification (id, expediteur_id, destinataire_id, candidature_id, application_candidature_id, message, type_notification, lu, date_creation, reponse_critere_id, critere_evaluation_id, code_critere, libelle_critere, traitee, date_traitement) FROM stdin;
4	23	27	15	\N	Une nouvelle étape est disponible : Contrôle administratif pour le dossier Elite.	WORKFLOW_ETAPE_DISPONIBLE	f	2026-08-06 12:38:57.267257	\N	\N	\N	\N	f	\N
5	23	28	15	\N	Une nouvelle étape est disponible : Contrôle administratif pour le dossier Elite.	WORKFLOW_ETAPE_DISPONIBLE	f	2026-08-06 13:32:15.540181	\N	\N	\N	\N	f	\N
6	33	34	17	\N	Une nouvelle étape est disponible : Évaluation technique pour le dossier FOURNISSEUR TEST WORKFLOW SARL.	WORKFLOW_ETAPE_DISPONIBLE	f	2026-08-07 09:56:30.001632	\N	\N	\N	\N	f	\N
7	34	35	17	\N	Une nouvelle étape est disponible : Décision finale pour le dossier FOURNISSEUR TEST WORKFLOW SARL.	WORKFLOW_ETAPE_DISPONIBLE	f	2026-08-07 09:57:41.572871	\N	\N	\N	\N	f	\N
8	35	33	17	\N	Une nouvelle étape est disponible : Classement par zone pour le dossier FOURNISSEUR TEST WORKFLOW SARL.	WORKFLOW_ETAPE_DISPONIBLE	f	2026-08-07 10:02:36.99315	\N	\N	\N	\N	f	\N
9	23	28	17	\N	Une nouvelle étape est disponible : Classement par zone pour le dossier FOURNISSEUR TEST WORKFLOW SARL.	WORKFLOW_ETAPE_DISPONIBLE	f	2026-08-07 10:30:33.21046	\N	\N	\N	\N	f	\N
10	23	38	15	\N	Une nouvelle étape est disponible : Recevabilité administrative pour le dossier Elite.	WORKFLOW_ETAPE_DISPONIBLE	f	2026-08-13 15:53:40.85744	\N	\N	\N	\N	f	\N
\.


--
-- Data for Name: password_reset_token; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_token (id, utilisateur_id, token, expires_at, used, created_at) FROM stdin;
\.


--
-- Data for Name: piece_candidature_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.piece_candidature_config (id, code_piece, nom_piece, raison_piece, note_candidat, note_evaluateur, format_accepte, obligatoire, ordre_affichage, actif, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: piece_candidature_deposee; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.piece_candidature_deposee (id, candidature_id, piece_candidature_config_id, nom_fichier, chemin_fichier, type_contenu, taille_fichier, statut, commentaire, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: piece_critere_deposee; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.piece_critere_deposee (id, candidature_id, application_candidature_id, critere_piece_id, nom_fichier, chemin_fichier, type_contenu, taille_fichier, statut, commentaire, created_at, updated_at) FROM stdin;
25	15	20	203	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\15\\applications\\20\\pieces-criteres\\piece_203_6a13b93c-aebb-4373-9443-3226fd2c04ac_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-08-03 12:10:04.573979	2026-08-03 12:10:04.573979
23	15	20	205	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\15\\applications\\20\\pieces-criteres\\piece_205_c2544b89-0564-4139-8e4e-9210d87bae21_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-08-03 12:10:04.573979	2026-08-03 12:10:04.573979
24	15	20	204	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\15\\applications\\20\\pieces-criteres\\piece_204_c350964f-91e5-46b4-b781-05ed36f6ecd0_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-08-03 12:10:04.573979	2026-08-03 12:10:04.573979
\.


--
-- Data for Name: projet_reference; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projet_reference (id, application_candidature_id, nom_projet, lot_concerne, maitre_ouvrage, ville, zone, type_projet, surface_m2, niveaux_r_plus, nombre_sous_sols, annee_livraison, bim_oui_non, seuil_ok, fichier_p11, fichier_p12, montant, mission_realisee, adresse_projet, latitude, longitude, zone_el_emar_id, zone_el_emar_nom, zone_validee, zone_el_emar_commentaire) FROM stdin;
6	21	Immeuble Test Centre Urbain	Lot de test — Cycle qualification	Maître d’ouvrage Test 2	Tunis	Centre Urbain Nord	Tertiaire	9000.00	6	1	2023	f	t	\N	\N	5100000.00	Études techniques	Centre Urbain Nord, Tunis	36.847	10.19	40	Zone 1	t	\N
5	21	Résidence Test Lac	Lot de test — Cycle qualification	Maître d’ouvrage Test 1	Tunis	Lac	Résidentiel	12500.00	8	2	2024	t	t	\N	\N	8500000.00	Études et coordination	Les Berges du Lac, Tunis	36.835	10.24	41	Zone 2	t	\N
4	20	Resdance	Aménagement des jardins	5000	Tunis		test	500000.00	5	5	2022	t	t	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\15\\applications\\20\\references\\p11_reference_4_0522ae5b-0348-4488-a964-7c845ead99f6_testt.pdf	\N	5038.00		Rue Haffouz, Ksar-Said, Délégation Le Bardo, Tunis, Gouvernorat Tunis, 2017, Tunisie	\N	\N	\N	\N	f	\N
\.


--
-- Data for Name: reponse_critere; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reponse_critere (id, candidature_id, application_candidature_id, critere_evaluation_id, valeur_text, valeur_number, valeur_boolean, valeur_date, created_at, updated_at) FROM stdin;
32	15	20	196	\N	\N	\N	\N	2026-08-03 12:10:04.520564	2026-08-03 12:10:04.520564
33	15	20	197	\N	\N	\N	\N	2026-08-03 12:10:04.527577	2026-08-03 12:10:04.527577
34	15	20	198	\N	\N	\N	\N	2026-08-03 12:10:04.531565	2026-08-03 12:10:04.531565
35	17	21	234	Trois projets comparables réalisés entre 2022 et 2025.	\N	\N	\N	2026-08-06 13:53:19.201418	2026-08-06 13:53:19.201418
36	17	21	235	Équipe de 8 personnes avec chef de projet, ingénieurs et dessinateurs.	\N	\N	\N	2026-08-06 13:53:19.201418	2026-08-06 13:53:19.201418
37	17	21	236	Méthodologie en cinq phases avec contrôles qualité internes.	\N	\N	\N	2026-08-06 13:53:19.201418	2026-08-06 13:53:19.201418
\.


--
-- Data for Name: role_acces; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_acces (id, code_role, nom_role, description, type_role, role_systeme, actif, created_at) FROM stdin;
10	ADMIN	Administrateur	Administration complète de la plateforme.	INTERNE	t	t	2026-07-30 10:16:59.975217
13	GESTIONNAIRE	Gestionnaire qualification	Recevabilité, contrôle administratif, solvabilité et classement.	INTERNE	f	t	2026-08-06 13:53:19.201418
11	EVALUATEUR	Évaluateur technique	Évaluation des critères techniques et demandes de complément.	INTERNE	f	t	2026-08-03 11:58:02.00524
15	DECIDEUR	Décideur agrément	Consultation des résultats et décision finale.	INTERNE	f	t	2026-08-06 13:53:19.201418
16	ACHATS_CONSULTATION	Direction / Achats - consultation	Consultation en lecture seule des évaluations et de la liste agréée.	INTERNE	f	t	2026-08-06 13:53:19.201418
17	CND	Candidat / Fournisseur	Compte externe candidat ou fournisseur.	EXTERNE	f	t	2026-08-06 13:53:19.201418
\.


--
-- Data for Name: role_categorie_evaluation_acces; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_categorie_evaluation_acces (role_id, categorie_evaluation_id, created_at) FROM stdin;
10	165	2026-08-05 14:33:37.122009
10	170	2026-08-05 14:33:37.122009
10	175	2026-08-05 14:33:37.122009
10	129	2026-08-06 13:50:25.549854
10	130	2026-08-06 13:50:25.549854
10	131	2026-08-06 13:50:25.549854
10	132	2026-08-06 13:50:25.549854
10	133	2026-08-06 13:50:25.549854
10	134	2026-08-06 13:50:25.549854
10	135	2026-08-06 13:50:25.549854
10	136	2026-08-06 13:50:25.549854
10	137	2026-08-06 13:50:25.549854
10	138	2026-08-06 13:50:25.549854
10	139	2026-08-06 13:50:25.549854
10	140	2026-08-06 13:50:25.549854
10	141	2026-08-06 13:50:25.549854
10	142	2026-08-06 13:50:25.549854
10	143	2026-08-06 13:50:25.549854
10	144	2026-08-06 13:50:25.549854
10	145	2026-08-06 13:50:25.549854
10	146	2026-08-06 13:50:25.549854
10	147	2026-08-06 13:50:25.549854
10	148	2026-08-06 13:50:25.549854
10	149	2026-08-06 13:50:25.549854
10	150	2026-08-06 13:50:25.549854
10	151	2026-08-06 13:50:25.549854
10	152	2026-08-06 13:50:25.549854
10	153	2026-08-06 13:50:25.549854
10	154	2026-08-06 13:50:25.549854
10	155	2026-08-06 13:50:25.549854
10	156	2026-08-06 13:50:25.549854
10	157	2026-08-06 13:50:25.549854
10	158	2026-08-06 13:50:25.549854
10	159	2026-08-06 13:50:25.549854
10	160	2026-08-06 13:50:25.549854
10	161	2026-08-06 13:50:25.549854
10	162	2026-08-06 13:50:25.549854
10	163	2026-08-06 13:50:25.549854
10	164	2026-08-06 13:50:25.549854
10	166	2026-08-06 13:50:25.549854
10	167	2026-08-06 13:50:25.549854
10	168	2026-08-06 13:50:25.549854
10	169	2026-08-06 13:50:25.549854
10	171	2026-08-06 13:50:25.549854
10	172	2026-08-06 13:50:25.549854
10	173	2026-08-06 13:50:25.549854
10	174	2026-08-06 13:50:25.549854
10	176	2026-08-06 13:53:19.201418
11	176	2026-08-06 13:53:19.201418
15	176	2026-08-06 13:53:19.201418
16	176	2026-08-06 13:53:19.201418
11	129	2026-08-06 14:51:53.748286
11	130	2026-08-06 14:51:53.748286
11	131	2026-08-06 14:51:53.748286
11	132	2026-08-06 14:51:53.748286
11	133	2026-08-06 14:51:53.748286
11	134	2026-08-06 14:51:53.748286
11	135	2026-08-06 14:51:53.748286
11	136	2026-08-06 14:51:53.748286
11	137	2026-08-06 14:51:53.748286
11	138	2026-08-06 14:51:53.748286
11	139	2026-08-06 14:51:53.748286
11	140	2026-08-06 14:51:53.748286
11	141	2026-08-06 14:51:53.748286
11	142	2026-08-06 14:51:53.748286
11	143	2026-08-06 14:51:53.748286
11	144	2026-08-06 14:51:53.748286
11	145	2026-08-06 14:51:53.748286
11	146	2026-08-06 14:51:53.748286
11	147	2026-08-06 14:51:53.748286
11	148	2026-08-06 14:51:53.748286
11	149	2026-08-06 14:51:53.748286
11	150	2026-08-06 14:51:53.748286
11	151	2026-08-06 14:51:53.748286
11	152	2026-08-06 14:51:53.748286
11	153	2026-08-06 14:51:53.748286
11	154	2026-08-06 14:51:53.748286
11	155	2026-08-06 14:51:53.748286
11	156	2026-08-06 14:51:53.748286
11	157	2026-08-06 14:51:53.748286
11	158	2026-08-06 14:51:53.748286
11	159	2026-08-06 14:51:53.748286
11	160	2026-08-06 14:51:53.748286
11	161	2026-08-06 14:51:53.748286
11	162	2026-08-06 14:51:53.748286
11	163	2026-08-06 14:51:53.748286
11	164	2026-08-06 14:51:53.748286
11	165	2026-08-06 14:51:53.748286
11	166	2026-08-06 14:51:53.748286
11	167	2026-08-06 14:51:53.748286
11	168	2026-08-06 14:51:53.748286
11	169	2026-08-06 14:51:53.748286
11	170	2026-08-06 14:51:53.748286
11	171	2026-08-06 14:51:53.748286
11	172	2026-08-06 14:51:53.748286
11	173	2026-08-06 14:51:53.748286
11	174	2026-08-06 14:51:53.748286
11	175	2026-08-06 14:51:53.748286
\.


--
-- Data for Name: role_module_acces; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_module_acces (id, role_id, module_id, autorise, created_at) FROM stdin;
185	11	1	f	2026-08-03 11:58:02.00524
163	10	1	t	2026-07-30 10:16:59.975217
164	10	3	t	2026-07-30 10:16:59.975217
165	10	4	t	2026-07-30 10:16:59.975217
170	10	9	t	2026-07-30 10:16:59.975217
172	10	11	t	2026-07-30 10:16:59.975217
173	10	13	t	2026-07-30 10:16:59.975217
169	10	8	t	2026-07-30 10:16:59.975217
187	11	3	f	2026-08-03 11:58:02.00524
288	15	5	t	2026-08-06 13:53:19.201418
300	15	14	t	2026-08-06 13:53:19.201418
301	15	51	t	2026-08-06 13:53:19.201418
304	15	76	t	2026-08-06 13:53:19.201418
305	15	77	t	2026-08-06 13:53:19.201418
306	15	78	t	2026-08-06 13:53:19.201418
307	15	79	t	2026-08-06 13:53:19.201418
188	11	4	f	2026-08-03 11:58:02.00524
189	11	5	f	2026-08-03 11:58:02.00524
190	11	6	f	2026-08-03 11:58:02.00524
192	11	8	f	2026-08-03 11:58:02.00524
193	11	9	f	2026-08-03 11:58:02.00524
195	11	11	f	2026-08-03 11:58:02.00524
197	11	13	f	2026-08-03 11:58:02.00524
198	11	14	f	2026-08-03 11:58:02.00524
231	11	83	f	2026-08-06 12:14:52.419508
234	11	85	f	2026-08-06 12:14:52.419508
236	11	82	f	2026-08-06 12:14:52.419508
237	11	89	f	2026-08-06 12:14:52.419508
240	11	86	f	2026-08-06 12:14:52.419508
244	11	88	f	2026-08-06 12:14:52.419508
225	11	76	f	2026-08-04 13:32:24.960615
226	11	77	f	2026-08-04 13:32:24.960615
229	11	80	f	2026-08-04 13:32:24.960615
230	11	81	f	2026-08-04 13:32:24.960615
199	11	15	f	2026-08-03 11:58:02.00524
200	11	16	f	2026-08-03 11:58:02.00524
201	11	17	f	2026-08-03 11:58:02.00524
209	11	27	f	2026-08-03 11:58:02.00524
210	11	28	f	2026-08-03 11:58:02.00524
246	11	84	f	2026-08-06 12:14:52.419508
254	13	25	f	2026-08-06 13:53:19.201418
256	13	52	f	2026-08-06 13:53:19.201418
218	11	51	f	2026-08-04 11:33:50.099511
216	11	52	f	2026-08-04 11:33:50.099511
204	11	22	f	2026-08-03 11:58:02.00524
205	11	23	f	2026-08-03 11:58:02.00524
191	11	7	f	2026-08-03 11:58:02.00524
194	11	10	f	2026-08-03 11:58:02.00524
257	13	6	f	2026-08-06 13:53:19.201418
258	13	7	f	2026-08-06 13:53:19.201418
259	13	10	f	2026-08-06 13:53:19.201418
260	13	16	f	2026-08-06 13:53:19.201418
261	13	17	f	2026-08-06 13:53:19.201418
263	13	15	f	2026-08-06 13:53:19.201418
264	13	82	f	2026-08-06 13:53:19.201418
266	13	51	f	2026-08-06 13:53:19.201418
271	13	78	f	2026-08-06 13:53:19.201418
272	13	79	f	2026-08-06 13:53:19.201418
274	13	81	f	2026-08-06 13:53:19.201418
275	13	83	f	2026-08-06 13:53:19.201418
276	13	84	f	2026-08-06 13:53:19.201418
277	13	85	f	2026-08-06 13:53:19.201418
278	13	86	f	2026-08-06 13:53:19.201418
280	13	88	f	2026-08-06 13:53:19.201418
281	13	89	f	2026-08-06 13:53:19.201418
291	15	52	f	2026-08-06 13:53:19.201418
292	15	6	f	2026-08-06 13:53:19.201418
293	15	7	f	2026-08-06 13:53:19.201418
294	15	10	f	2026-08-06 13:53:19.201418
295	15	16	f	2026-08-06 13:53:19.201418
296	15	17	f	2026-08-06 13:53:19.201418
298	15	15	f	2026-08-06 13:53:19.201418
299	15	82	f	2026-08-06 13:53:19.201418
308	15	80	t	2026-08-06 13:53:19.201418
310	15	83	f	2026-08-06 13:53:19.201418
311	15	84	f	2026-08-06 13:53:19.201418
312	15	85	f	2026-08-06 13:53:19.201418
313	15	86	f	2026-08-06 13:53:19.201418
315	15	88	f	2026-08-06 13:53:19.201418
316	15	89	f	2026-08-06 13:53:19.201418
323	16	5	f	2026-08-06 13:53:19.201418
326	16	52	f	2026-08-06 13:53:19.201418
327	16	6	f	2026-08-06 13:53:19.201418
328	16	7	f	2026-08-06 13:53:19.201418
329	16	10	f	2026-08-06 13:53:19.201418
330	16	16	f	2026-08-06 13:53:19.201418
331	16	17	f	2026-08-06 13:53:19.201418
332	16	18	f	2026-08-06 13:53:19.201418
333	16	15	f	2026-08-06 13:53:19.201418
334	16	82	f	2026-08-06 13:53:19.201418
335	16	14	f	2026-08-06 13:53:19.201418
336	16	51	f	2026-08-06 13:53:19.201418
339	16	76	f	2026-08-06 13:53:19.201418
340	16	77	f	2026-08-06 13:53:19.201418
341	16	78	f	2026-08-06 13:53:19.201418
342	16	79	f	2026-08-06 13:53:19.201418
343	16	80	f	2026-08-06 13:53:19.201418
344	16	81	f	2026-08-06 13:53:19.201418
345	16	83	f	2026-08-06 13:53:19.201418
346	16	84	f	2026-08-06 13:53:19.201418
347	16	85	f	2026-08-06 13:53:19.201418
348	16	86	f	2026-08-06 13:53:19.201418
350	16	88	f	2026-08-06 13:53:19.201418
351	16	89	f	2026-08-06 13:53:19.201418
356	17	12	f	2026-08-06 13:53:19.201418
361	17	21	f	2026-08-06 13:53:19.201418
366	17	22	f	2026-08-06 13:53:19.201418
371	17	23	f	2026-08-06 13:53:19.201418
376	17	24	f	2026-08-06 13:53:19.201418
381	17	2	f	2026-08-06 13:53:19.201418
386	17	5	f	2026-08-06 13:53:19.201418
387	13	1	f	2026-08-06 13:53:19.201418
389	15	1	f	2026-08-06 13:53:19.201418
390	16	1	f	2026-08-06 13:53:19.201418
391	17	1	f	2026-08-06 13:53:19.201418
394	15	4	f	2026-08-06 13:53:19.201418
395	16	4	f	2026-08-06 13:53:19.201418
396	17	4	f	2026-08-06 13:53:19.201418
397	13	11	f	2026-08-06 13:53:19.201418
399	15	11	f	2026-08-06 13:53:19.201418
400	16	11	f	2026-08-06 13:53:19.201418
401	17	11	f	2026-08-06 13:53:19.201418
402	13	13	f	2026-08-06 13:53:19.201418
405	16	13	f	2026-08-06 13:53:19.201418
406	17	13	f	2026-08-06 13:53:19.201418
411	17	25	f	2026-08-06 13:53:19.201418
416	17	27	f	2026-08-06 13:53:19.201418
419	15	3	f	2026-08-06 13:53:19.201418
421	17	3	f	2026-08-06 13:53:19.201418
426	17	52	f	2026-08-06 13:53:19.201418
431	17	6	f	2026-08-06 13:53:19.201418
436	17	7	f	2026-08-06 13:53:19.201418
441	17	10	f	2026-08-06 13:53:19.201418
446	17	16	f	2026-08-06 13:53:19.201418
451	17	17	f	2026-08-06 13:53:19.201418
456	17	18	f	2026-08-06 13:53:19.201418
457	13	8	f	2026-08-06 13:53:19.201418
459	15	8	f	2026-08-06 13:53:19.201418
460	16	8	f	2026-08-06 13:53:19.201418
461	17	8	f	2026-08-06 13:53:19.201418
466	17	15	f	2026-08-06 13:53:19.201418
467	13	9	f	2026-08-06 13:53:19.201418
469	15	9	f	2026-08-06 13:53:19.201418
470	16	9	f	2026-08-06 13:53:19.201418
471	17	9	f	2026-08-06 13:53:19.201418
476	17	82	f	2026-08-06 13:53:19.201418
481	17	14	f	2026-08-06 13:53:19.201418
486	17	51	f	2026-08-06 13:53:19.201418
491	17	26	f	2026-08-06 13:53:19.201418
496	17	28	f	2026-08-06 13:53:19.201418
501	17	76	f	2026-08-06 13:53:19.201418
506	17	77	f	2026-08-06 13:53:19.201418
511	17	78	f	2026-08-06 13:53:19.201418
516	17	79	f	2026-08-06 13:53:19.201418
521	17	80	f	2026-08-06 13:53:19.201418
526	17	81	f	2026-08-06 13:53:19.201418
531	17	83	f	2026-08-06 13:53:19.201418
536	17	84	f	2026-08-06 13:53:19.201418
541	17	85	f	2026-08-06 13:53:19.201418
546	17	86	f	2026-08-06 13:53:19.201418
551	17	87	f	2026-08-06 13:53:19.201418
556	17	88	f	2026-08-06 13:53:19.201418
561	17	89	f	2026-08-06 13:53:19.201418
176	10	12	t	2026-07-30 10:16:59.975217
181	10	21	t	2026-08-03 11:57:40.943652
182	10	22	t	2026-08-03 11:57:40.943652
183	10	23	t	2026-08-03 11:57:40.943652
184	10	24	t	2026-08-03 11:57:40.943652
175	10	2	t	2026-07-30 10:16:59.975217
166	10	5	t	2026-07-30 10:16:59.975217
211	10	25	t	2026-08-03 12:14:22.034171
212	10	27	t	2026-08-03 12:14:22.034171
215	10	52	t	2026-08-04 11:33:50.099511
167	10	6	t	2026-07-30 10:16:59.975217
168	10	7	t	2026-07-30 10:16:59.975217
171	10	10	t	2026-07-30 10:16:59.975217
178	10	16	t	2026-07-30 10:16:59.975217
180	10	17	t	2026-07-30 10:16:59.975217
179	10	18	t	2026-07-30 10:16:59.975217
177	10	15	t	2026-07-30 10:16:59.975217
238	10	82	t	2026-08-06 12:14:52.419508
174	10	14	t	2026-07-30 10:16:59.975217
217	10	51	t	2026-08-04 11:33:50.099511
213	10	26	t	2026-08-03 12:14:56.030991
214	10	28	t	2026-08-04 11:15:50.041354
219	10	76	t	2026-08-04 13:32:24.960615
220	10	77	t	2026-08-04 13:32:24.960615
221	10	78	t	2026-08-04 13:32:24.960615
222	10	79	t	2026-08-04 13:32:24.960615
223	10	80	t	2026-08-04 13:32:24.960615
224	10	81	t	2026-08-04 13:32:24.960615
233	10	83	t	2026-08-06 12:14:52.419508
245	10	84	t	2026-08-06 12:14:52.419508
232	10	85	t	2026-08-06 12:14:52.419508
243	10	86	t	2026-08-06 12:14:52.419508
239	10	87	t	2026-08-06 12:14:52.419508
241	10	88	t	2026-08-06 12:14:52.419508
235	10	89	t	2026-08-06 12:14:52.419508
248	13	21	t	2026-08-06 13:53:19.201418
252	13	2	t	2026-08-06 13:53:19.201418
253	13	5	t	2026-08-06 13:53:19.201418
262	13	18	t	2026-08-06 13:53:19.201418
392	13	4	t	2026-08-06 13:53:19.201418
417	13	3	t	2026-08-06 13:53:19.201418
186	11	2	t	2026-08-03 11:58:02.00524
206	11	24	t	2026-08-03 11:58:02.00524
203	11	21	t	2026-08-03 11:58:02.00524
202	11	18	t	2026-08-03 11:58:02.00524
286	15	24	t	2026-08-06 13:53:19.201418
287	15	2	t	2026-08-06 13:53:19.201418
289	15	25	t	2026-08-06 13:53:19.201418
290	15	27	t	2026-08-06 13:53:19.201418
297	15	18	t	2026-08-06 13:53:19.201418
302	15	26	t	2026-08-06 13:53:19.201418
317	16	12	t	2026-08-06 13:53:19.201418
318	16	21	t	2026-08-06 13:53:19.201418
319	16	22	t	2026-08-06 13:53:19.201418
320	16	23	t	2026-08-06 13:53:19.201418
321	16	24	t	2026-08-06 13:53:19.201418
322	16	2	t	2026-08-06 13:53:19.201418
324	16	25	t	2026-08-06 13:53:19.201418
325	16	27	t	2026-08-06 13:53:19.201418
337	16	26	t	2026-08-06 13:53:19.201418
338	16	28	t	2026-08-06 13:53:19.201418
349	16	87	t	2026-08-06 13:53:19.201418
420	16	3	t	2026-08-06 13:53:19.201418
279	13	87	f	2026-08-06 13:53:19.201418
251	13	24	f	2026-08-06 13:53:19.201418
267	13	26	f	2026-08-06 13:53:19.201418
268	13	28	f	2026-08-06 13:53:19.201418
208	11	26	f	2026-08-03 11:58:02.00524
242	11	87	f	2026-08-06 12:14:52.419508
282	15	12	t	2026-08-06 13:53:19.201418
404	15	13	t	2026-08-06 13:53:19.201418
303	15	28	t	2026-08-06 13:53:19.201418
269	13	76	t	2026-08-06 13:53:19.201418
270	13	77	t	2026-08-06 13:53:19.201418
273	13	80	t	2026-08-06 13:53:19.201418
227	11	78	t	2026-08-04 13:32:24.960615
309	15	81	t	2026-08-06 13:53:19.201418
283	15	21	t	2026-08-06 13:53:19.201418
284	15	22	t	2026-08-06 13:53:19.201418
285	15	23	t	2026-08-06 13:53:19.201418
314	15	87	t	2026-08-06 13:53:19.201418
247	13	12	t	2026-08-06 13:53:19.201418
249	13	22	t	2026-08-06 13:53:19.201418
250	13	23	t	2026-08-06 13:53:19.201418
265	13	14	t	2026-08-06 13:53:19.201418
255	13	27	t	2026-08-06 13:53:19.201418
196	11	12	t	2026-08-03 11:58:02.00524
207	11	25	t	2026-08-03 11:58:02.00524
228	11	79	t	2026-08-04 13:32:24.960615
\.


--
-- Data for Name: type_intervenant; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.type_intervenant (id, code, libelle, description, actif, ordre_affichage, created_at, updated_at) FROM stdin;
12	ETUDES	Études	Bureaux d’études et consultants techniques.	t	1	2026-07-10 09:12:59.70308	2026-07-10 11:34:22.558298
13	TRAVAUX	Travaux	Entreprises et prestataires de travaux.	t	2	2026-07-10 09:12:59.70308	2026-07-10 11:34:22.558298
14	FOURNITURES	Fournitures	Fournisseurs techniques et fournisseurs de produits décoratifs.	t	3	2026-07-10 09:12:59.70308	2026-07-10 11:34:22.558298
15	TEST_WORKFLOW	Test workflow	Type dédié au scénario fonctionnel El Emar.	t	999	2026-08-06 13:53:19.201418	2026-08-06 13:53:19.201418
\.


--
-- Data for Name: utilisateur; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.utilisateur (id, nom, email, mot_de_passe, type_utilisateur, statut_compte, premiere_connexion, created_at, updated_at, intervenant_id, fonction, telephone, must_change_password, actif, role_id, candidature_id, departement) FROM stdin;
23	Administrateurr	admin@elemar.com	$2y$10$1hVtYmkjetYqW6/4TZzEnOuG6Ad/eL0rZ46bzZCGglgadPvw5jHQa	IT	ACTIF	f	2026-07-30 10:16:59.975217	2026-08-06 13:57:20.652026	\N	Administrateur système	\N	f	t	10	\N	\N
27	GESTIONNAIRE	gestionnaireee.workflow@test.elemar.local	$2a$10$91jnFeF3C1TnlijvvJycKeZeZRY8EGDMXTX3QBy/MAjSB4QgfsFRu	ACHAT	ACTIF	t	2026-08-03 21:48:06.670896	2026-08-06 13:59:40.547141	\N	GESTIONNAIRE	\N	t	t	13	\N	\N
29	technique	technique@elemar.com	$2a$10$GffcKFn87IRZ7FI9cFLojeU8L2/6iSkusqc4UvrpQDCNQuyngqS6a	TECHNIQUE	ACTIF	t	2026-08-04 10:58:39.933708	2026-08-06 14:15:16.848123	\N	Administrateur système	\N	t	t	15	\N	\N
32	Admin Workflow Test	admin.workflow@test.elemar.local	$2y$10$lSvaPuu8CCtn4HaQjPwl9eh18Ee9tf3p3wg/w2R5GuSfjC7nB/4JO	IT	ACTIF	f	2026-08-06 13:53:19.201418	2026-08-06 14:22:07.087862	\N	Administrateur système	+21670000001	f	t	10	\N	\N
33	Gestionnaire Test	gestionnaire.workflow@test.elemar.local	$2y$10$lSvaPuu8CCtn4HaQjPwl9eh18Ee9tf3p3wg/w2R5GuSfjC7nB/4JO	ACHAT	ACTIF	f	2026-08-06 13:53:19.201418	2026-08-06 14:22:07.087862	\N	Gestionnaire qualification	+21670000002	f	t	13	\N	\N
34	Évaluateur Technique Test	evaluateur.workflow@test.elemar.local	$2y$10$lSvaPuu8CCtn4HaQjPwl9eh18Ee9tf3p3wg/w2R5GuSfjC7nB/4JO	TECHNIQUE	ACTIF	f	2026-08-06 13:53:19.201418	2026-08-06 14:22:07.087862	\N	Évaluateur technique	+21670000003	f	t	11	\N	\N
35	Décideur Test	decideur.workflow@test.elemar.local	$2y$10$lSvaPuu8CCtn4HaQjPwl9eh18Ee9tf3p3wg/w2R5GuSfjC7nB/4JO	COMITE	ACTIF	f	2026-08-06 13:53:19.201418	2026-08-06 14:22:07.087862	\N	Décideur agrément	+21670000004	f	t	15	\N	\N
28	comité	comite@elemar.com	$2a$10$Ol2ejtk8LdYprAJe4OS81uEbm0TETQLgM.SXFVPR0kL7UQL/ZURnq	COMITE	ACTIF	t	2026-08-04 10:22:57.086626	2026-08-07 10:34:41.568832	\N	oumeyma.tibaoui@elite.tn	\N	t	t	15	\N	\N
26	Oumeyma tibaouii	oumeyma.tibaoui@elite.tn	$2a$10$x9l2/.UVuBRtWS7rKehGouKO8zrArKldZxhZMjNYU4PY4bydYm652	CND	ACTIF	t	2026-08-02 19:56:11.911505	2026-08-06 11:47:02.950757	\N	Responsable	+21671456789	t	t	\N	15	\N
31	mourad	mourad@garni.gmail	$2a$10$oQNKpDD/I5/7IjbItkhIM.1XMT135fuO.fMZi7ILPxENKUo3SGN4C	CND	ACTIF	t	2026-08-06 13:47:16.919696	2026-08-06 13:47:16.919696	\N	Responsable	+21671456711	t	t	\N	16	\N
36	Achats Lecture Seule Test	achats.workflow@test.elemar.local	$2y$10$lSvaPuu8CCtn4HaQjPwl9eh18Ee9tf3p3wg/w2R5GuSfjC7nB/4JO	ACHAT	ACTIF	f	2026-08-06 13:53:19.201418	2026-08-06 14:22:07.087862	\N	Direction / Achats	+21670000005	f	t	16	\N	\N
37	Fournisseur Test Workflow	candidat.workflow@test.candidat.local	$2y$10$lSvaPuu8CCtn4HaQjPwl9eh18Ee9tf3p3wg/w2R5GuSfjC7nB/4JO	CND	ACTIF	f	2026-08-06 13:53:19.201418	2026-08-06 14:22:07.087862	\N	Responsable fournisseur	+21670000006	f	t	17	17	\N
38	Nahla	nahla@elamar.com	$2a$10$lukcCV.B7LLgyA2gGFNSy.OkwtuiK0V0f1/HJj02qB9IrQvOc9Wbq	ACHAT	ACTIF	t	2026-08-07 10:44:52.56674	2026-08-07 10:44:52.56674	\N	Responsable	\N	t	t	10	\N	\N
\.


--
-- Data for Name: workflow_etape_el_emar; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflow_etape_el_emar (id, candidature_id, utilisateur_affecte_id, code_etape, libelle_etape, ordre, statut, commentaire_transmission, date_debut, date_fin, date_reouverture, motif_reouverture, cree_par_id, modifie_par_id, created_at, updated_at, version) FROM stdin;
7	17	33	RECEVABILITE_ADMINISTRATIVE	Recevabilité administrative	1	TERMINEE	\N	2026-08-07 09:47:03.292495	2026-08-07 09:56:29.808619	\N	\N	32	33	2026-08-06 13:53:19.201418	2026-08-07 09:56:29.814619	2
8	17	34	EVALUATION_TECHNIQUE	Évaluation technique	2	TERMINEE	\N	2026-08-07 09:57:21.05092	2026-08-07 09:57:41.565873	\N	\N	32	34	2026-08-06 13:53:19.201418	2026-08-07 09:57:41.565873	4
9	17	35	DECISION_FINALE	Décision finale	3	TERMINEE	\N	2026-08-07 10:02:19.641442	2026-08-07 10:02:36.988781	\N	\N	32	35	2026-08-06 13:53:19.201418	2026-08-07 10:02:36.988781	3
10	17	28	CLASSEMENT_ZONE	Classement par zone	4	EN_COURS	\N	2026-08-07 10:31:25.821801	\N	\N	\N	32	28	2026-08-06 13:53:19.201418	2026-08-07 10:31:25.823808	3
11	15	38	RECEVABILITE_ADMINISTRATIVE	Recevabilité administrative	1	A_TRAITER	\N	\N	\N	\N	\N	23	23	2026-08-13 15:53:40.818537	2026-08-13 15:53:40.820519	0
12	15	34	EVALUATION_TECHNIQUE	Évaluation technique	2	EN_ATTENTE	\N	\N	\N	\N	\N	23	23	2026-08-13 15:53:40.818537	2026-08-13 15:53:40.84052	0
13	15	35	DECISION_FINALE	Décision finale	3	EN_ATTENTE	\N	\N	\N	\N	\N	23	23	2026-08-13 15:53:40.818537	2026-08-13 15:53:40.842519	0
14	15	27	CLASSEMENT_ZONE	Classement par zone	4	EN_ATTENTE	\N	\N	\N	\N	\N	23	23	2026-08-13 15:53:40.818537	2026-08-13 15:53:40.84544	0
\.


--
-- Data for Name: workflow_modele_etape; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflow_modele_etape (id, code_etape, libelle_etape, ordre, departement_code, utilisateur_defaut_id, actif, modifie_par_id, created_at, updated_at, version) FROM stdin;
5	RECEVABILITE_ADMINISTRATIVE	Recevabilité administrative	1	ACHAT	38	t	23	2026-08-13 22:20:12.919444	2026-08-13 22:20:12.919444	0
6	EVALUATION_TECHNIQUE	Évaluation technique	2	TECHNIQUE	34	t	23	2026-08-13 22:20:12.919444	2026-08-13 22:20:12.919444	0
7	DECISION_FINALE	Décision finale	3	COMITE	35	t	23	2026-08-13 22:20:12.919444	2026-08-13 22:20:12.919444	0
8	CLASSEMENT_ZONE	Classement par zone	4	ACHAT	27	t	23	2026-08-13 22:20:12.919444	2026-08-13 22:20:12.919444	0
\.


--
-- Data for Name: zone; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.zone (id, nom_zone, created_at, utilisateur_id, adresse, latitude, longitude, description, updated_at) FROM stdin;
40	Zone 1	2026-07-10 09:12:59.70308	\N	Lac	\N	\N	Zone 1 / Z1 : très haut standing, très complexe, seuil minimum 80/100.	2026-07-10 09:12:59.70308
41	Zone 2	2026-07-10 09:12:59.70308	\N	Ain Zaghouan Nord ; Jardins de Carthage	\N	\N	Zone 2 / Z2 : haut standing, complexe, seuil minimum 80/100.	2026-07-10 09:12:59.70308
42	Zone 3	2026-07-10 09:12:59.70308	\N	Ain Zaghouan ; Soukra	\N	\N	Zone 3 / Z3 : standard, complexité modérée, seuil minimum 80/100.	2026-07-10 09:12:59.70308
29	Zone 2	2026-06-19 14:33:46.957615	\N	Lac	36.861074	10.183468		2026-07-03 10:32:08.790133
44	Zone 1	2026-07-10 11:26:22.518528	\N	Bejaoua, Délégation de Sidi Thabet, Gouvernorat Ariana, 2021, Tunisie	36.861315	10.024637	Zone 1 : Lac. Classification très haut standing, complexité très élevée. Seuil minimum 80/100.	2026-07-10 11:26:22.518528
\.


--
-- Name: application_candidature_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.application_candidature_id_seq', 21, true);


--
-- Name: candidature_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.candidature_id_seq', 17, true);


--
-- Name: candidature_lot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.candidature_lot_id_seq', 35, true);


--
-- Name: categorie_evaluation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categorie_evaluation_id_seq', 176, true);


--
-- Name: classement_zone_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.classement_zone_id_seq', 17, true);


--
-- Name: critere_evaluation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.critere_evaluation_id_seq', 236, true);


--
-- Name: critere_piece_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.critere_piece_id_seq', 236, true);


--
-- Name: evaluation_critere_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evaluation_critere_id_seq', 7, true);


--
-- Name: evaluation_element_lock_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evaluation_element_lock_id_seq', 14, true);


--
-- Name: grille_evaluation_lot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.grille_evaluation_lot_id_seq', 61, true);


--
-- Name: historique_action_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.historique_action_id_seq', 161, true);


--
-- Name: lot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lot_id_seq', 82, true);


--
-- Name: module_navbar_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.module_navbar_id_seq', 89, true);


--
-- Name: notification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notification_id_seq', 10, true);


--
-- Name: password_reset_token_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_reset_token_id_seq', 5, true);


--
-- Name: piece_candidature_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.piece_candidature_config_id_seq', 1, false);


--
-- Name: piece_candidature_deposee_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.piece_candidature_deposee_id_seq', 1, false);


--
-- Name: piece_critere_deposee_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.piece_critere_deposee_id_seq', 25, true);


--
-- Name: projet_reference_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.projet_reference_id_seq', 6, true);


--
-- Name: reponse_critere_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reponse_critere_id_seq', 37, true);


--
-- Name: role_acces_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.role_acces_id_seq', 17, true);


--
-- Name: role_module_acces_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.role_module_acces_id_seq', 596, true);


--
-- Name: type_intervenant_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.type_intervenant_id_seq', 15, true);


--
-- Name: utilisateur_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.utilisateur_id_seq', 38, true);


--
-- Name: workflow_etape_el_emar_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.workflow_etape_el_emar_id_seq', 14, true);


--
-- Name: workflow_modele_etape_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.workflow_modele_etape_id_seq', 8, true);


--
-- Name: zone_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.zone_id_seq', 44, true);


--
-- Name: application_candidature application_candidature_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_candidature
    ADD CONSTRAINT application_candidature_pkey PRIMARY KEY (id);


--
-- Name: candidature_lot candidature_lot_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidature_lot
    ADD CONSTRAINT candidature_lot_pkey PRIMARY KEY (id);


--
-- Name: candidature candidature_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidature
    ADD CONSTRAINT candidature_pkey PRIMARY KEY (id);


--
-- Name: categorie_evaluation categorie_evaluation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorie_evaluation
    ADD CONSTRAINT categorie_evaluation_pkey PRIMARY KEY (id);


--
-- Name: classement_zone classement_zone_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classement_zone
    ADD CONSTRAINT classement_zone_pkey PRIMARY KEY (id);


--
-- Name: critere_evaluation critere_evaluation_grille_evaluation_lot_id_code_critere_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.critere_evaluation
    ADD CONSTRAINT critere_evaluation_grille_evaluation_lot_id_code_critere_key UNIQUE (grille_evaluation_lot_id, code_critere);


--
-- Name: critere_evaluation critere_evaluation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.critere_evaluation
    ADD CONSTRAINT critere_evaluation_pkey PRIMARY KEY (id);


--
-- Name: critere_piece critere_piece_critere_evaluation_id_code_piece_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.critere_piece
    ADD CONSTRAINT critere_piece_critere_evaluation_id_code_piece_key UNIQUE (critere_evaluation_id, code_piece);


--
-- Name: critere_piece critere_piece_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.critere_piece
    ADD CONSTRAINT critere_piece_pkey PRIMARY KEY (id);


--
-- Name: evaluation_critere evaluation_critere_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_critere
    ADD CONSTRAINT evaluation_critere_pkey PRIMARY KEY (id);


--
-- Name: evaluation_element_lock evaluation_element_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_element_lock
    ADD CONSTRAINT evaluation_element_lock_pkey PRIMARY KEY (id);


--
-- Name: grille_evaluation_lot grille_evaluation_lot_code_grille_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grille_evaluation_lot
    ADD CONSTRAINT grille_evaluation_lot_code_grille_key UNIQUE (code_grille);


--
-- Name: grille_evaluation_lot grille_evaluation_lot_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grille_evaluation_lot
    ADD CONSTRAINT grille_evaluation_lot_pkey PRIMARY KEY (id);


--
-- Name: historique_action historique_action_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historique_action
    ADD CONSTRAINT historique_action_pkey PRIMARY KEY (id);


--
-- Name: lot lot_code_lot_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lot
    ADD CONSTRAINT lot_code_lot_key UNIQUE (code_lot);


--
-- Name: lot lot_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lot
    ADD CONSTRAINT lot_pkey PRIMARY KEY (id);


--
-- Name: module_navbar module_navbar_code_module_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_navbar
    ADD CONSTRAINT module_navbar_code_module_key UNIQUE (code_module);


--
-- Name: module_navbar module_navbar_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_navbar
    ADD CONSTRAINT module_navbar_pkey PRIMARY KEY (id);


--
-- Name: notification notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (id);


--
-- Name: password_reset_token password_reset_token_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_pkey PRIMARY KEY (id);


--
-- Name: password_reset_token password_reset_token_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_token_key UNIQUE (token);


--
-- Name: piece_candidature_config piece_candidature_config_code_piece_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.piece_candidature_config
    ADD CONSTRAINT piece_candidature_config_code_piece_key UNIQUE (code_piece);


--
-- Name: piece_candidature_config piece_candidature_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.piece_candidature_config
    ADD CONSTRAINT piece_candidature_config_pkey PRIMARY KEY (id);


--
-- Name: piece_candidature_deposee piece_candidature_deposee_candidature_id_piece_candidature__key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.piece_candidature_deposee
    ADD CONSTRAINT piece_candidature_deposee_candidature_id_piece_candidature__key UNIQUE (candidature_id, piece_candidature_config_id);


--
-- Name: piece_candidature_deposee piece_candidature_deposee_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.piece_candidature_deposee
    ADD CONSTRAINT piece_candidature_deposee_pkey PRIMARY KEY (id);


--
-- Name: piece_critere_deposee piece_critere_deposee_application_candidature_id_critere_pi_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.piece_critere_deposee
    ADD CONSTRAINT piece_critere_deposee_application_candidature_id_critere_pi_key UNIQUE (application_candidature_id, critere_piece_id);


--
-- Name: piece_critere_deposee piece_critere_deposee_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.piece_critere_deposee
    ADD CONSTRAINT piece_critere_deposee_pkey PRIMARY KEY (id);


--
-- Name: role_categorie_evaluation_acces pk_role_categorie_evaluation_acces; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_categorie_evaluation_acces
    ADD CONSTRAINT pk_role_categorie_evaluation_acces PRIMARY KEY (role_id, categorie_evaluation_id);


--
-- Name: projet_reference projet_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projet_reference
    ADD CONSTRAINT projet_reference_pkey PRIMARY KEY (id);


--
-- Name: reponse_critere reponse_critere_application_candidature_id_critere_evaluati_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reponse_critere
    ADD CONSTRAINT reponse_critere_application_candidature_id_critere_evaluati_key UNIQUE (application_candidature_id, critere_evaluation_id);


--
-- Name: reponse_critere reponse_critere_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reponse_critere
    ADD CONSTRAINT reponse_critere_pkey PRIMARY KEY (id);


--
-- Name: role_acces role_acces_code_role_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_acces
    ADD CONSTRAINT role_acces_code_role_key UNIQUE (code_role);


--
-- Name: role_acces role_acces_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_acces
    ADD CONSTRAINT role_acces_pkey PRIMARY KEY (id);


--
-- Name: role_module_acces role_module_acces_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_module_acces
    ADD CONSTRAINT role_module_acces_pkey PRIMARY KEY (id);


--
-- Name: type_intervenant type_intervenant_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_intervenant
    ADD CONSTRAINT type_intervenant_code_key UNIQUE (code);


--
-- Name: type_intervenant type_intervenant_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_intervenant
    ADD CONSTRAINT type_intervenant_pkey PRIMARY KEY (id);


--
-- Name: workflow_modele_etape uk_workflow_modele_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_modele_etape
    ADD CONSTRAINT uk_workflow_modele_code UNIQUE (code_etape);


--
-- Name: workflow_modele_etape uk_workflow_modele_ordre; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_modele_etape
    ADD CONSTRAINT uk_workflow_modele_ordre UNIQUE (ordre);


--
-- Name: application_candidature uq_application_candidature_direct_lot; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_candidature
    ADD CONSTRAINT uq_application_candidature_direct_lot UNIQUE (candidature_id, lot_id);


--
-- Name: candidature_lot uq_candidature_lot; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidature_lot
    ADD CONSTRAINT uq_candidature_lot UNIQUE (candidature_id, lot_id);


--
-- Name: classement_zone uq_classement_zone; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classement_zone
    ADD CONSTRAINT uq_classement_zone UNIQUE (application_candidature_id, zone_id);


--
-- Name: role_module_acces uq_role_module_acces; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_module_acces
    ADD CONSTRAINT uq_role_module_acces UNIQUE (role_id, module_id);


--
-- Name: workflow_etape_el_emar uq_workflow_candidature_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_etape_el_emar
    ADD CONSTRAINT uq_workflow_candidature_code UNIQUE (candidature_id, code_etape);


--
-- Name: workflow_etape_el_emar uq_workflow_candidature_ordre; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_etape_el_emar
    ADD CONSTRAINT uq_workflow_candidature_ordre UNIQUE (candidature_id, ordre);


--
-- Name: utilisateur utilisateur_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateur
    ADD CONSTRAINT utilisateur_email_key UNIQUE (email);


--
-- Name: utilisateur utilisateur_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateur
    ADD CONSTRAINT utilisateur_pkey PRIMARY KEY (id);


--
-- Name: workflow_etape_el_emar workflow_etape_el_emar_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_etape_el_emar
    ADD CONSTRAINT workflow_etape_el_emar_pkey PRIMARY KEY (id);


--
-- Name: workflow_modele_etape workflow_modele_etape_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_modele_etape
    ADD CONSTRAINT workflow_modele_etape_pkey PRIMARY KEY (id);


--
-- Name: zone zone_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zone
    ADD CONSTRAINT zone_pkey PRIMARY KEY (id);


--
-- Name: idx_application_candidature; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_application_candidature ON public.application_candidature USING btree (candidature_id);


--
-- Name: idx_application_candidature_candidature; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_application_candidature_candidature ON public.application_candidature USING btree (candidature_id);


--
-- Name: idx_application_candidature_lot; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_application_candidature_lot ON public.application_candidature USING btree (lot_id);


--
-- Name: idx_application_decision; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_application_decision ON public.application_candidature USING btree (decision_finale);


--
-- Name: idx_application_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_application_statut ON public.application_candidature USING btree (statut);


--
-- Name: idx_candidature_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_candidature_statut ON public.candidature USING btree (statut);


--
-- Name: idx_classement_zone_application_candidature_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classement_zone_application_candidature_id ON public.classement_zone USING btree (application_candidature_id);


--
-- Name: idx_classement_zone_zone_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classement_zone_zone_id ON public.classement_zone USING btree (zone_id);


--
-- Name: idx_evaluation_critere_evaluateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluation_critere_evaluateur ON public.evaluation_critere USING btree (evaluateur_id);


--
-- Name: idx_evaluation_critere_reponse; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluation_critere_reponse ON public.evaluation_critere USING btree (reponse_critere_id);


--
-- Name: idx_evaluation_critere_reponse_latest; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluation_critere_reponse_latest ON public.evaluation_critere USING btree (reponse_critere_id, id DESC);


--
-- Name: idx_historique_application; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_historique_application ON public.historique_action USING btree (application_candidature_id);


--
-- Name: idx_historique_candidature; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_historique_candidature ON public.historique_action USING btree (candidature_id);


--
-- Name: idx_notification_destinataire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notification_destinataire ON public.notification USING btree (destinataire_id);


--
-- Name: idx_notification_lu; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notification_lu ON public.notification USING btree (lu);


--
-- Name: idx_projet_reference_application_candidature_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projet_reference_application_candidature_id ON public.projet_reference USING btree (application_candidature_id);


--
-- Name: idx_role_categorie_categorie; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_categorie_categorie ON public.role_categorie_evaluation_acces USING btree (categorie_evaluation_id);


--
-- Name: idx_role_categorie_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_categorie_role ON public.role_categorie_evaluation_acces USING btree (role_id);


--
-- Name: idx_utilisateur_candidature_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_utilisateur_candidature_id ON public.utilisateur USING btree (candidature_id);


--
-- Name: idx_utilisateur_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_utilisateur_role_id ON public.utilisateur USING btree (role_id);


--
-- Name: idx_workflow_candidature; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workflow_candidature ON public.workflow_etape_el_emar USING btree (candidature_id);


--
-- Name: idx_workflow_modele_actif_ordre; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workflow_modele_actif_ordre ON public.workflow_modele_etape USING btree (actif, ordre);


--
-- Name: idx_workflow_utilisateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workflow_utilisateur ON public.workflow_etape_el_emar USING btree (utilisateur_affecte_id);


--
-- Name: idx_workflow_utilisateur_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workflow_utilisateur_statut ON public.workflow_etape_el_emar USING btree (utilisateur_affecte_id, statut);


--
-- Name: ix_evaluation_element_lock_candidature; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_evaluation_element_lock_candidature ON public.evaluation_element_lock USING btree (candidature_id, actif);


--
-- Name: ix_evaluation_element_lock_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_evaluation_element_lock_user ON public.evaluation_element_lock USING btree (verrouille_par_id, actif);


--
-- Name: uk_lot_code_lower; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uk_lot_code_lower ON public.lot USING btree (lower((code_lot)::text));


--
-- Name: uk_lot_type_code_lower; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uk_lot_type_code_lower ON public.lot USING btree (type_intervenant_id, lower((code_lot)::text));


--
-- Name: uk_lot_type_nom_lower; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uk_lot_type_nom_lower ON public.lot USING btree (type_intervenant_id, lower((nom_lot)::text));


--
-- Name: uk_zone_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uk_zone_location ON public.zone USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));


--
-- Name: uq_application_candidature_lot_direct; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_application_candidature_lot_direct ON public.application_candidature USING btree (candidature_id, lot_id);


--
-- Name: uq_categorie_type_global_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_categorie_type_global_code ON public.categorie_evaluation USING btree (type_intervenant_id, lower((code)::text)) WHERE (lot_id IS NULL);


--
-- Name: uq_categorie_type_lot_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_categorie_type_lot_code ON public.categorie_evaluation USING btree (type_intervenant_id, lot_id, lower((code)::text)) WHERE (lot_id IS NOT NULL);


--
-- Name: uq_workflow_etape_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_workflow_etape_active ON public.workflow_etape_el_emar USING btree (candidature_id) WHERE ((statut)::text = ANY ((ARRAY['A_TRAITER'::character varying, 'EN_COURS'::character varying, 'REOUVERTE'::character varying])::text[]));


--
-- Name: ux_evaluation_critere_reponse_critere; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ux_evaluation_critere_reponse_critere ON public.evaluation_critere USING btree (reponse_critere_id);


--
-- Name: ux_evaluation_element_lock_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ux_evaluation_element_lock_active ON public.evaluation_element_lock USING btree (candidature_id, element_type, element_key) WHERE (actif IS TRUE);


--
-- Name: candidature trg_candidature_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_candidature_updated_at BEFORE UPDATE ON public.candidature FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categorie_evaluation trg_reset_category_access_on_deactivate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_reset_category_access_on_deactivate AFTER UPDATE OF actif ON public.categorie_evaluation FOR EACH ROW EXECUTE FUNCTION public.reset_category_access_on_deactivate();


--
-- Name: module_navbar trg_reset_module_access_on_deactivate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_reset_module_access_on_deactivate AFTER UPDATE OF actif ON public.module_navbar FOR EACH ROW EXECUTE FUNCTION public.reset_module_access_on_deactivate();


--
-- Name: module_navbar trg_sync_access_for_module; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sync_access_for_module AFTER INSERT OR UPDATE OF actif ON public.module_navbar FOR EACH ROW EXECUTE FUNCTION public.sync_access_for_module();


--
-- Name: role_acces trg_sync_access_for_role; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sync_access_for_role AFTER INSERT OR UPDATE OF actif, type_role ON public.role_acces FOR EACH ROW EXECUTE FUNCTION public.sync_access_for_role();


--
-- Name: utilisateur trg_utilisateur_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_utilisateur_updated_at BEFORE UPDATE ON public.utilisateur FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: application_candidature application_candidature_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_candidature
    ADD CONSTRAINT application_candidature_candidature_id_fkey FOREIGN KEY (candidature_id) REFERENCES public.candidature(id) ON DELETE CASCADE;


--
-- Name: candidature candidature_cree_par_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidature
    ADD CONSTRAINT candidature_cree_par_utilisateur_id_fkey FOREIGN KEY (cree_par_utilisateur_id) REFERENCES public.utilisateur(id) ON DELETE SET NULL;


--
-- Name: classement_zone classement_zone_application_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classement_zone
    ADD CONSTRAINT classement_zone_application_candidature_id_fkey FOREIGN KEY (application_candidature_id) REFERENCES public.application_candidature(id) ON DELETE CASCADE;


--
-- Name: classement_zone classement_zone_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classement_zone
    ADD CONSTRAINT classement_zone_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zone(id) ON DELETE CASCADE;


--
-- Name: critere_evaluation critere_evaluation_grille_evaluation_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.critere_evaluation
    ADD CONSTRAINT critere_evaluation_grille_evaluation_lot_id_fkey FOREIGN KEY (grille_evaluation_lot_id) REFERENCES public.grille_evaluation_lot(id) ON DELETE CASCADE;


--
-- Name: application_candidature fk_application_candidature_lot_restrict; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_candidature
    ADD CONSTRAINT fk_application_candidature_lot_restrict FOREIGN KEY (lot_id) REFERENCES public.lot(id) ON DELETE RESTRICT;


--
-- Name: candidature_lot fk_candidature_lot_candidature; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidature_lot
    ADD CONSTRAINT fk_candidature_lot_candidature FOREIGN KEY (candidature_id) REFERENCES public.candidature(id);


--
-- Name: candidature_lot fk_candidature_lot_lot; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidature_lot
    ADD CONSTRAINT fk_candidature_lot_lot FOREIGN KEY (lot_id) REFERENCES public.lot(id);


--
-- Name: candidature fk_candidature_type_intervenant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidature
    ADD CONSTRAINT fk_candidature_type_intervenant FOREIGN KEY (type_intervenant_id) REFERENCES public.type_intervenant(id);


--
-- Name: categorie_evaluation fk_categorie_evaluation_lot_cascade; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorie_evaluation
    ADD CONSTRAINT fk_categorie_evaluation_lot_cascade FOREIGN KEY (lot_id) REFERENCES public.lot(id) ON DELETE CASCADE;


--
-- Name: categorie_evaluation fk_categorie_type_intervenant_cascade; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorie_evaluation
    ADD CONSTRAINT fk_categorie_type_intervenant_cascade FOREIGN KEY (type_intervenant_id) REFERENCES public.type_intervenant(id) ON DELETE CASCADE;


--
-- Name: critere_evaluation fk_critere_categorie_cascade; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.critere_evaluation
    ADD CONSTRAINT fk_critere_categorie_cascade FOREIGN KEY (categorie_evaluation_id) REFERENCES public.categorie_evaluation(id) ON DELETE CASCADE;


--
-- Name: critere_evaluation fk_critere_evaluation_lot_cascade; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.critere_evaluation
    ADD CONSTRAINT fk_critere_evaluation_lot_cascade FOREIGN KEY (lot_id) REFERENCES public.lot(id) ON DELETE CASCADE;


--
-- Name: critere_piece fk_critere_piece_critere_cascade; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.critere_piece
    ADD CONSTRAINT fk_critere_piece_critere_cascade FOREIGN KEY (critere_evaluation_id) REFERENCES public.critere_evaluation(id) ON DELETE CASCADE;


--
-- Name: evaluation_critere fk_evaluation_critere_evaluateur; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_critere
    ADD CONSTRAINT fk_evaluation_critere_evaluateur FOREIGN KEY (evaluateur_id) REFERENCES public.utilisateur(id) ON DELETE SET NULL;


--
-- Name: evaluation_critere fk_evaluation_critere_reponse; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_critere
    ADD CONSTRAINT fk_evaluation_critere_reponse FOREIGN KEY (reponse_critere_id) REFERENCES public.reponse_critere(id) ON DELETE CASCADE;


--
-- Name: grille_evaluation_lot fk_grille_evaluation_lot_lot_cascade; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grille_evaluation_lot
    ADD CONSTRAINT fk_grille_evaluation_lot_lot_cascade FOREIGN KEY (lot_id) REFERENCES public.lot(id) ON DELETE CASCADE;


--
-- Name: lot fk_lot_type_intervenant_cascade; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lot
    ADD CONSTRAINT fk_lot_type_intervenant_cascade FOREIGN KEY (type_intervenant_id) REFERENCES public.type_intervenant(id) ON DELETE CASCADE;


--
-- Name: piece_critere_deposee fk_piece_deposee_critere_piece_cascade; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.piece_critere_deposee
    ADD CONSTRAINT fk_piece_deposee_critere_piece_cascade FOREIGN KEY (critere_piece_id) REFERENCES public.critere_piece(id) ON DELETE CASCADE;


--
-- Name: reponse_critere fk_reponse_critere_critere_cascade; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reponse_critere
    ADD CONSTRAINT fk_reponse_critere_critere_cascade FOREIGN KEY (critere_evaluation_id) REFERENCES public.critere_evaluation(id) ON DELETE CASCADE;


--
-- Name: role_categorie_evaluation_acces fk_role_categorie_categorie; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_categorie_evaluation_acces
    ADD CONSTRAINT fk_role_categorie_categorie FOREIGN KEY (categorie_evaluation_id) REFERENCES public.categorie_evaluation(id) ON DELETE CASCADE;


--
-- Name: role_categorie_evaluation_acces fk_role_categorie_role; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_categorie_evaluation_acces
    ADD CONSTRAINT fk_role_categorie_role FOREIGN KEY (role_id) REFERENCES public.role_acces(id) ON DELETE CASCADE;


--
-- Name: utilisateur fk_utilisateur_candidature; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateur
    ADD CONSTRAINT fk_utilisateur_candidature FOREIGN KEY (candidature_id) REFERENCES public.candidature(id);


--
-- Name: utilisateur fk_utilisateur_role_acces; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateur
    ADD CONSTRAINT fk_utilisateur_role_acces FOREIGN KEY (role_id) REFERENCES public.role_acces(id);


--
-- Name: workflow_etape_el_emar fk_workflow_candidature; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_etape_el_emar
    ADD CONSTRAINT fk_workflow_candidature FOREIGN KEY (candidature_id) REFERENCES public.candidature(id);


--
-- Name: workflow_etape_el_emar fk_workflow_cree_par; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_etape_el_emar
    ADD CONSTRAINT fk_workflow_cree_par FOREIGN KEY (cree_par_id) REFERENCES public.utilisateur(id);


--
-- Name: workflow_modele_etape fk_workflow_modele_modifie_par; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_modele_etape
    ADD CONSTRAINT fk_workflow_modele_modifie_par FOREIGN KEY (modifie_par_id) REFERENCES public.utilisateur(id);


--
-- Name: workflow_modele_etape fk_workflow_modele_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_modele_etape
    ADD CONSTRAINT fk_workflow_modele_user FOREIGN KEY (utilisateur_defaut_id) REFERENCES public.utilisateur(id);


--
-- Name: workflow_etape_el_emar fk_workflow_modifie_par; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_etape_el_emar
    ADD CONSTRAINT fk_workflow_modifie_par FOREIGN KEY (modifie_par_id) REFERENCES public.utilisateur(id);


--
-- Name: workflow_etape_el_emar fk_workflow_utilisateur_affecte; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_etape_el_emar
    ADD CONSTRAINT fk_workflow_utilisateur_affecte FOREIGN KEY (utilisateur_affecte_id) REFERENCES public.utilisateur(id);


--
-- Name: zone fk_zone_utilisateur; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zone
    ADD CONSTRAINT fk_zone_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(id) ON DELETE SET NULL;


--
-- Name: historique_action historique_action_application_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historique_action
    ADD CONSTRAINT historique_action_application_candidature_id_fkey FOREIGN KEY (application_candidature_id) REFERENCES public.application_candidature(id) ON DELETE CASCADE;


--
-- Name: historique_action historique_action_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historique_action
    ADD CONSTRAINT historique_action_candidature_id_fkey FOREIGN KEY (candidature_id) REFERENCES public.candidature(id) ON DELETE CASCADE;


--
-- Name: historique_action historique_action_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historique_action
    ADD CONSTRAINT historique_action_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(id) ON DELETE SET NULL;


--
-- Name: notification notification_application_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_application_candidature_id_fkey FOREIGN KEY (application_candidature_id) REFERENCES public.application_candidature(id) ON DELETE CASCADE;


--
-- Name: notification notification_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_candidature_id_fkey FOREIGN KEY (candidature_id) REFERENCES public.candidature(id) ON DELETE CASCADE;


--
-- Name: notification notification_destinataire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_destinataire_id_fkey FOREIGN KEY (destinataire_id) REFERENCES public.utilisateur(id) ON DELETE CASCADE;


--
-- Name: notification notification_expediteur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_expediteur_id_fkey FOREIGN KEY (expediteur_id) REFERENCES public.utilisateur(id) ON DELETE SET NULL;


--
-- Name: password_reset_token password_reset_token_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(id) ON DELETE CASCADE;


--
-- Name: piece_candidature_deposee piece_candidature_deposee_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.piece_candidature_deposee
    ADD CONSTRAINT piece_candidature_deposee_candidature_id_fkey FOREIGN KEY (candidature_id) REFERENCES public.candidature(id) ON DELETE CASCADE;


--
-- Name: piece_candidature_deposee piece_candidature_deposee_piece_candidature_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.piece_candidature_deposee
    ADD CONSTRAINT piece_candidature_deposee_piece_candidature_config_id_fkey FOREIGN KEY (piece_candidature_config_id) REFERENCES public.piece_candidature_config(id);


--
-- Name: piece_critere_deposee piece_critere_deposee_application_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.piece_critere_deposee
    ADD CONSTRAINT piece_critere_deposee_application_candidature_id_fkey FOREIGN KEY (application_candidature_id) REFERENCES public.application_candidature(id) ON DELETE CASCADE;


--
-- Name: piece_critere_deposee piece_critere_deposee_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.piece_critere_deposee
    ADD CONSTRAINT piece_critere_deposee_candidature_id_fkey FOREIGN KEY (candidature_id) REFERENCES public.candidature(id) ON DELETE CASCADE;


--
-- Name: projet_reference projet_reference_application_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projet_reference
    ADD CONSTRAINT projet_reference_application_candidature_id_fkey FOREIGN KEY (application_candidature_id) REFERENCES public.application_candidature(id) ON DELETE CASCADE;


--
-- Name: reponse_critere reponse_critere_application_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reponse_critere
    ADD CONSTRAINT reponse_critere_application_candidature_id_fkey FOREIGN KEY (application_candidature_id) REFERENCES public.application_candidature(id) ON DELETE CASCADE;


--
-- Name: reponse_critere reponse_critere_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reponse_critere
    ADD CONSTRAINT reponse_critere_candidature_id_fkey FOREIGN KEY (candidature_id) REFERENCES public.candidature(id) ON DELETE CASCADE;


--
-- Name: role_module_acces role_module_acces_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_module_acces
    ADD CONSTRAINT role_module_acces_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.module_navbar(id) ON DELETE CASCADE;


--
-- Name: role_module_acces role_module_acces_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_module_acces
    ADD CONSTRAINT role_module_acces_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.role_acces(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict RbofAfaAY9hPPr5la1OZY1YN8SuMasD0qDCCcoVz2N8OrI2UKnn1aXdOSAeEfWJ

