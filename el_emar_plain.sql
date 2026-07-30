--
-- PostgreSQL database dump
--

\restrict mKHGBNDGm09KCTm25Rrs07pMtdU7QbtgkMndZ6MwZc5C1JGe5Qs0QzmvNA1HX7H

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
-- Name: decision_finale; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.decision_finale AS ENUM (
    'ADMIS',
    'REJETE',
    'A_CORRIGER',
    'IRRECEVABLE'
);


--
-- Name: modele_reponse; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: phase_document; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.phase_document AS ENUM (
    'PH1',
    'PH2'
);


--
-- Name: statut_application; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: statut_candidature; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: statut_compte; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.statut_compte AS ENUM (
    'ACTIF',
    'INACTIF',
    'BLOQUE',
    'EN_ATTENTE'
);


--
-- Name: statut_document; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: statut_rfp; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.statut_rfp AS ENUM (
    'BROUILLON',
    'PUBLIE',
    'CLOTURE'
);


--
-- Name: type_utilisateur; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.type_utilisateur AS ENUM (
    'EL_EMAR',
    'CND',
    'IT',
    'DA',
    'ADMIN'
);


--
-- Name: drop_fk_by_column(text, text, text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: appel_candidature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appel_candidature (
    id bigint NOT NULL,
    titre character varying(255) NOT NULL,
    description text,
    date_debut date,
    date_limite date,
    statut public.statut_rfp DEFAULT 'BROUILLON'::public.statut_rfp NOT NULL,
    seuil_admission integer DEFAULT 80,
    objectif text,
    email_depot character varying(150),
    utilisateur_id bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actif boolean DEFAULT false,
    CONSTRAINT chk_seuil_admission CHECK (((seuil_admission >= 0) AND (seuil_admission <= 100)))
);


--
-- Name: appel_candidature_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appel_candidature_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appel_candidature_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appel_candidature_id_seq OWNED BY public.appel_candidature.id;


--
-- Name: appel_lot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appel_lot (
    id bigint NOT NULL,
    appel_id bigint NOT NULL,
    lot_id bigint NOT NULL,
    titre_lot character varying(255),
    description_lot text,
    actif boolean DEFAULT true
);


--
-- Name: appel_lot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appel_lot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appel_lot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appel_lot_id_seq OWNED BY public.appel_lot.id;


--
-- Name: appel_zone; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appel_zone (
    id bigint NOT NULL,
    appel_id bigint NOT NULL,
    zone_id bigint NOT NULL
);


--
-- Name: appel_zone_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appel_zone_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appel_zone_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appel_zone_id_seq OWNED BY public.appel_zone.id;


--
-- Name: application_candidature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.application_candidature (
    id bigint NOT NULL,
    candidature_id bigint NOT NULL,
    appel_lot_id bigint,
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


--
-- Name: application_candidature_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.application_candidature_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: application_candidature_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.application_candidature_id_seq OWNED BY public.application_candidature.id;


--
-- Name: candidature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidature (
    id bigint NOT NULL,
    utilisateur_id bigint,
    appel_candidature_id bigint,
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
    intervenant_id bigint,
    nom_entreprise character varying(200),
    adresse text,
    profil_complete boolean DEFAULT false,
    actif boolean DEFAULT true
);


--
-- Name: candidature_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.candidature_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: candidature_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.candidature_id_seq OWNED BY public.candidature.id;


--
-- Name: candidature_lot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidature_lot (
    id bigint NOT NULL,
    candidature_id bigint NOT NULL,
    lot_id bigint NOT NULL,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: candidature_lot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.candidature_lot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: candidature_lot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.candidature_lot_id_seq OWNED BY public.candidature_lot.id;


--
-- Name: categorie_evaluation; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: categorie_evaluation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categorie_evaluation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categorie_evaluation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categorie_evaluation_id_seq OWNED BY public.categorie_evaluation.id;


--
-- Name: old_champ_appreciation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.old_champ_appreciation (
    id bigint NOT NULL,
    section character varying(150),
    nom_champ character varying(150),
    label_champ character varying(255) NOT NULL,
    description_champ text,
    type_champ character varying(50),
    condition_procedure text,
    code_pxx character varying(50),
    options text,
    obligatoire boolean DEFAULT false,
    ordre_affichage integer DEFAULT 0,
    actif boolean DEFAULT true,
    lot_id bigint NOT NULL,
    modele_reponse character varying(50) NOT NULL,
    critere_notation_id bigint
);


--
-- Name: champ_appreciation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.champ_appreciation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: champ_appreciation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.champ_appreciation_id_seq OWNED BY public.old_champ_appreciation.id;


--
-- Name: classement_zone; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: classement_zone_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.classement_zone_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: classement_zone_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.classement_zone_id_seq OWNED BY public.classement_zone.id;


--
-- Name: critere_evaluation; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: critere_evaluation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.critere_evaluation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: critere_evaluation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.critere_evaluation_id_seq OWNED BY public.critere_evaluation.id;


--
-- Name: old_critere_notation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.old_critere_notation (
    id bigint NOT NULL,
    grille_notation_id bigint NOT NULL,
    lot_id bigint,
    code_critere character varying(80) NOT NULL,
    section character varying(255) NOT NULL,
    libelle_critere text NOT NULL,
    description_critere text,
    label_candidat text NOT NULL,
    aide_candidat text,
    raison_collecte text,
    note_evaluateur text,
    points_max numeric(6,2) DEFAULT 0,
    bareme_notation text,
    type_notation character varying(50) DEFAULT 'MANUEL'::character varying,
    eliminatoire boolean DEFAULT false,
    generer_champ boolean DEFAULT true,
    type_champ character varying(50) DEFAULT 'TEXT'::character varying,
    options_champ text,
    obligatoire boolean DEFAULT false,
    condition_affichage text,
    ordre_affichage integer DEFAULT 0,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: critere_notation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.critere_notation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: critere_notation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.critere_notation_id_seq OWNED BY public.old_critere_notation.id;


--
-- Name: critere_piece; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: critere_piece_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.critere_piece_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: critere_piece_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.critere_piece_id_seq OWNED BY public.critere_piece.id;


--
-- Name: old_document_demande; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.old_document_demande (
    id bigint NOT NULL,
    appel_lot_id bigint,
    code_document character varying(50),
    nom_document character varying(255) NOT NULL,
    phase public.phase_document NOT NULL,
    format_accepte character varying(100),
    obligatoire boolean DEFAULT true,
    applicable_a character varying(150),
    actif boolean DEFAULT true,
    ordre_affichage integer DEFAULT 0,
    lot_id bigint,
    applicable_tous_lots boolean DEFAULT false,
    critere_piece_id bigint
);


--
-- Name: document_demande_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_demande_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_demande_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_demande_id_seq OWNED BY public.old_document_demande.id;


--
-- Name: old_document_depose; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.old_document_depose (
    id bigint NOT NULL,
    application_candidature_id bigint NOT NULL,
    document_demande_id bigint NOT NULL,
    nom_fichier character varying(255),
    url_fichier text,
    statut_document public.statut_document DEFAULT 'NON_DEPOSE'::public.statut_document,
    commentaire_el_emar text,
    date_upload timestamp without time zone,
    date_verification timestamp without time zone,
    version integer DEFAULT 1,
    CONSTRAINT chk_version_document CHECK ((version >= 1))
);


--
-- Name: document_depose_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_depose_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_depose_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_depose_id_seq OWNED BY public.old_document_depose.id;


--
-- Name: old_donnees_generales_candidature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.old_donnees_generales_candidature (
    id bigint NOT NULL,
    application_candidature_id bigint,
    effectif_total integer,
    nb_ingenieurs_architectes integer,
    experience_responsable integer,
    bureau_multidisciplinaire boolean,
    disciplines_complementaires text,
    nb_projets_en_cours integer,
    chiffre_affaires_moyen_3ans numeric(15,2),
    candidature_id bigint,
    CONSTRAINT chk_effectif_total CHECK (((effectif_total IS NULL) OR (effectif_total >= 0))),
    CONSTRAINT chk_experience_responsable CHECK (((experience_responsable IS NULL) OR (experience_responsable >= 0))),
    CONSTRAINT chk_nb_ingenieurs CHECK (((nb_ingenieurs_architectes IS NULL) OR (nb_ingenieurs_architectes >= 0)))
);


--
-- Name: donnees_generales_candidature_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.donnees_generales_candidature_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: donnees_generales_candidature_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.donnees_generales_candidature_id_seq OWNED BY public.old_donnees_generales_candidature.id;


--
-- Name: grille_evaluation_lot; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: grille_evaluation_lot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grille_evaluation_lot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grille_evaluation_lot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grille_evaluation_lot_id_seq OWNED BY public.grille_evaluation_lot.id;


--
-- Name: old_grille_notation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.old_grille_notation (
    id bigint NOT NULL,
    lot_id bigint,
    appel_candidature_id bigint,
    code_grille character varying(80) NOT NULL,
    nom_grille character varying(255) NOT NULL,
    description text,
    total_points numeric(6,2) DEFAULT 100,
    seuil_admission numeric(6,2) DEFAULT 80,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: grille_notation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grille_notation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grille_notation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grille_notation_id_seq OWNED BY public.old_grille_notation.id;


--
-- Name: historique_action; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: historique_action_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.historique_action_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historique_action_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.historique_action_id_seq OWNED BY public.historique_action.id;


--
-- Name: old_liaison_champ_piece; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.old_liaison_champ_piece (
    id bigint NOT NULL,
    champ_appreciation_id bigint NOT NULL,
    document_demande_id bigint NOT NULL,
    obligatoire boolean DEFAULT true,
    condition_reponse character varying(100),
    message_prestataire text,
    ordre_affichage integer DEFAULT 0,
    actif boolean DEFAULT true,
    critere_piece_id bigint
);


--
-- Name: liaison_champ_piece_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.liaison_champ_piece_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: liaison_champ_piece_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.liaison_champ_piece_id_seq OWNED BY public.old_liaison_champ_piece.id;


--
-- Name: lot; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: lot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lot_id_seq OWNED BY public.lot.id;


--
-- Name: module_navbar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_navbar (
    id bigint NOT NULL,
    code_module character varying(120) NOT NULL,
    groupe character varying(150) NOT NULL,
    libelle character varying(180) NOT NULL,
    description text,
    route_front character varying(255) NOT NULL,
    icone character varying(100),
    ordre_groupe integer DEFAULT 0,
    ordre_module integer DEFAULT 0,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: module_navbar_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.module_navbar_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: module_navbar_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.module_navbar_id_seq OWNED BY public.module_navbar.id;


--
-- Name: note_evaluation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.note_evaluation (
    id bigint NOT NULL,
    application_candidature_id bigint NOT NULL,
    critere_evaluation_id bigint NOT NULL,
    note_obtenue numeric(5,2),
    commentaire_el_emar text,
    date_notation timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_note_obtenue CHECK (((note_obtenue IS NULL) OR (note_obtenue >= (0)::numeric)))
);


--
-- Name: note_evaluation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.note_evaluation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: note_evaluation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.note_evaluation_id_seq OWNED BY public.note_evaluation.id;


--
-- Name: notification; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: notification_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_id_seq OWNED BY public.notification.id;


--
-- Name: old_reponse_appreciation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.old_reponse_appreciation (
    id bigint NOT NULL,
    application_candidature_id bigint NOT NULL,
    champ_appreciation_id bigint NOT NULL,
    valeur_reponse text,
    piece_jointe_oui_non boolean,
    commentaire_bureau text,
    date_reponse timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: password_reset_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_token (
    id bigint NOT NULL,
    utilisateur_id bigint NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: password_reset_token_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_token_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_token_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_token_id_seq OWNED BY public.password_reset_token.id;


--
-- Name: piece_candidature_config; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: piece_candidature_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.piece_candidature_config_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: piece_candidature_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.piece_candidature_config_id_seq OWNED BY public.piece_candidature_config.id;


--
-- Name: piece_candidature_deposee; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: piece_candidature_deposee_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.piece_candidature_deposee_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: piece_candidature_deposee_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.piece_candidature_deposee_id_seq OWNED BY public.piece_candidature_deposee.id;


--
-- Name: piece_critere_deposee; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: piece_critere_deposee_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.piece_critere_deposee_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: piece_critere_deposee_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.piece_critere_deposee_id_seq OWNED BY public.piece_critere_deposee.id;


--
-- Name: projet_reference; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT chk_annee_livraison CHECK (((annee_livraison IS NULL) OR (annee_livraison >= 1900))),
    CONSTRAINT chk_nombre_sous_sols CHECK (((nombre_sous_sols IS NULL) OR (nombre_sous_sols >= 0))),
    CONSTRAINT chk_surface_m2 CHECK (((surface_m2 IS NULL) OR (surface_m2 >= (0)::numeric)))
);


--
-- Name: projet_reference_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.projet_reference_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: projet_reference_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.projet_reference_id_seq OWNED BY public.projet_reference.id;


--
-- Name: reponse_appreciation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reponse_appreciation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reponse_appreciation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reponse_appreciation_id_seq OWNED BY public.old_reponse_appreciation.id;


--
-- Name: reponse_critere; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: reponse_critere_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reponse_critere_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reponse_critere_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reponse_critere_id_seq OWNED BY public.reponse_critere.id;


--
-- Name: role_acces; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: role_acces_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_acces_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_acces_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_acces_id_seq OWNED BY public.role_acces.id;


--
-- Name: role_module_acces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_module_acces (
    id bigint NOT NULL,
    role_id bigint NOT NULL,
    module_id bigint NOT NULL,
    autorise boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: role_module_acces_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_module_acces_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_module_acces_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_module_acces_id_seq OWNED BY public.role_module_acces.id;


--
-- Name: type_intervenant; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: type_intervenant_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.type_intervenant_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: type_intervenant_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.type_intervenant_id_seq OWNED BY public.type_intervenant.id;


--
-- Name: utilisateur; Type: TABLE; Schema: public; Owner: -
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
    candidature_id bigint
);


--
-- Name: utilisateur_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.utilisateur_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: utilisateur_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.utilisateur_id_seq OWNED BY public.utilisateur.id;


--
-- Name: v_synthese_applications; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_synthese_applications AS
 SELECT ac.id AS application_id,
    a.id AS appel_id,
    a.titre AS appel_titre,
    l.nom_lot,
    c.raison_sociale,
    c.email_principal,
    ac.statut AS statut_application,
    ac.taux_completion,
    ac.phase1_validee,
    ac.note_finale,
    ac.decision_finale,
    ac.observation_finale,
    ac.date_soumission,
    ac.date_decision
   FROM ((((public.application_candidature ac
     JOIN public.candidature c ON ((c.id = ac.candidature_id)))
     JOIN public.appel_lot al ON ((al.id = ac.appel_lot_id)))
     JOIN public.appel_candidature a ON ((a.id = al.appel_id)))
     JOIN public.lot l ON ((l.id = al.lot_id)));


--
-- Name: zone; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: zone_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zone_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zone_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zone_id_seq OWNED BY public.zone.id;


--
-- Name: appel_candidature id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appel_candidature ALTER COLUMN id SET DEFAULT nextval('public.appel_candidature_id_seq'::regclass);


--
-- Name: appel_lot id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appel_lot ALTER COLUMN id SET DEFAULT nextval('public.appel_lot_id_seq'::regclass);


--
-- Name: appel_zone id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appel_zone ALTER COLUMN id SET DEFAULT nextval('public.appel_zone_id_seq'::regclass);


--
-- Name: application_candidature id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_candidature ALTER COLUMN id SET DEFAULT nextval('public.application_candidature_id_seq'::regclass);


--
-- Name: candidature id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidature ALTER COLUMN id SET DEFAULT nextval('public.candidature_id_seq'::regclass);


--
-- Name: candidature_lot id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidature_lot ALTER COLUMN id SET DEFAULT nextval('public.candidature_lot_id_seq'::regclass);


--
-- Name: categorie_evaluation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorie_evaluation ALTER COLUMN id SET DEFAULT nextval('public.categorie_evaluation_id_seq'::regclass);


--
-- Name: classement_zone id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classement_zone ALTER COLUMN id SET DEFAULT nextval('public.classement_zone_id_seq'::regclass);


--
-- Name: critere_evaluation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.critere_evaluation ALTER COLUMN id SET DEFAULT nextval('public.critere_evaluation_id_seq'::regclass);


--
-- Name: critere_piece id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.critere_piece ALTER COLUMN id SET DEFAULT nextval('public.critere_piece_id_seq'::regclass);


--
-- Name: grille_evaluation_lot id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grille_evaluation_lot ALTER COLUMN id SET DEFAULT nextval('public.grille_evaluation_lot_id_seq'::regclass);


--
-- Name: historique_action id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historique_action ALTER COLUMN id SET DEFAULT nextval('public.historique_action_id_seq'::regclass);


--
-- Name: lot id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot ALTER COLUMN id SET DEFAULT nextval('public.lot_id_seq'::regclass);


--
-- Name: module_navbar id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_navbar ALTER COLUMN id SET DEFAULT nextval('public.module_navbar_id_seq'::regclass);


--
-- Name: note_evaluation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_evaluation ALTER COLUMN id SET DEFAULT nextval('public.note_evaluation_id_seq'::regclass);


--
-- Name: notification id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification ALTER COLUMN id SET DEFAULT nextval('public.notification_id_seq'::regclass);


--
-- Name: old_champ_appreciation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_champ_appreciation ALTER COLUMN id SET DEFAULT nextval('public.champ_appreciation_id_seq'::regclass);


--
-- Name: old_critere_notation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_critere_notation ALTER COLUMN id SET DEFAULT nextval('public.critere_notation_id_seq'::regclass);


--
-- Name: old_document_demande id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_document_demande ALTER COLUMN id SET DEFAULT nextval('public.document_demande_id_seq'::regclass);


--
-- Name: old_document_depose id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_document_depose ALTER COLUMN id SET DEFAULT nextval('public.document_depose_id_seq'::regclass);


--
-- Name: old_donnees_generales_candidature id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_donnees_generales_candidature ALTER COLUMN id SET DEFAULT nextval('public.donnees_generales_candidature_id_seq'::regclass);


--
-- Name: old_grille_notation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_grille_notation ALTER COLUMN id SET DEFAULT nextval('public.grille_notation_id_seq'::regclass);


--
-- Name: old_liaison_champ_piece id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_liaison_champ_piece ALTER COLUMN id SET DEFAULT nextval('public.liaison_champ_piece_id_seq'::regclass);


--
-- Name: old_reponse_appreciation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_reponse_appreciation ALTER COLUMN id SET DEFAULT nextval('public.reponse_appreciation_id_seq'::regclass);


--
-- Name: password_reset_token id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_token ALTER COLUMN id SET DEFAULT nextval('public.password_reset_token_id_seq'::regclass);


--
-- Name: piece_candidature_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piece_candidature_config ALTER COLUMN id SET DEFAULT nextval('public.piece_candidature_config_id_seq'::regclass);


--
-- Name: piece_candidature_deposee id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piece_candidature_deposee ALTER COLUMN id SET DEFAULT nextval('public.piece_candidature_deposee_id_seq'::regclass);


--
-- Name: piece_critere_deposee id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piece_critere_deposee ALTER COLUMN id SET DEFAULT nextval('public.piece_critere_deposee_id_seq'::regclass);


--
-- Name: projet_reference id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projet_reference ALTER COLUMN id SET DEFAULT nextval('public.projet_reference_id_seq'::regclass);


--
-- Name: reponse_critere id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reponse_critere ALTER COLUMN id SET DEFAULT nextval('public.reponse_critere_id_seq'::regclass);


--
-- Name: role_acces id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_acces ALTER COLUMN id SET DEFAULT nextval('public.role_acces_id_seq'::regclass);


--
-- Name: role_module_acces id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_module_acces ALTER COLUMN id SET DEFAULT nextval('public.role_module_acces_id_seq'::regclass);


--
-- Name: type_intervenant id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.type_intervenant ALTER COLUMN id SET DEFAULT nextval('public.type_intervenant_id_seq'::regclass);


--
-- Name: utilisateur id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.utilisateur ALTER COLUMN id SET DEFAULT nextval('public.utilisateur_id_seq'::regclass);


--
-- Name: zone id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zone ALTER COLUMN id SET DEFAULT nextval('public.zone_id_seq'::regclass);


--
-- Data for Name: appel_candidature; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appel_candidature (id, titre, description, date_debut, date_limite, statut, seuil_admission, objectif, email_depot, utilisateur_id, created_at, updated_at, actif) FROM stdin;
5	Qualification des bureaux d’études — Projet Résidence El Emar Lac 2	Appel à candidature destiné à sélectionner des bureaux d’études qualifiés pour la conception et le suivi technique d’un projet résidentiel situé aux Berges du Lac 2.	2026-06-17	2027-01-17	CLOTURE	80	Identifier les bureaux d’études capables d’assurer les études techniques, la coordination et le suivi des travaux dans le respect des exigences qualité, délai et sécurité du projet.	consultation@elemar.tn	1	2026-06-17 11:31:02.007768	2026-06-18 12:39:38.292621	f
\.


--
-- Data for Name: appel_lot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appel_lot (id, appel_id, lot_id, titre_lot, description_lot, actif) FROM stdin;
86	5	2	Structure	Lot Structure / Génie civil	f
87	5	4	Électricité	Lot Électricité CFO / CFA / GTB	f
88	5	5	OPC	Ordonnancement, Pilotage et Coordination	f
\.


--
-- Data for Name: appel_zone; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appel_zone (id, appel_id, zone_id) FROM stdin;
\.


--
-- Data for Name: application_candidature; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.application_candidature (id, candidature_id, appel_lot_id, statut, date_creation, date_soumission, taux_completion, phase1_validee, note_finale, decision_finale, observation_finale, date_decision, lot_id, evaluateur_decision_id) FROM stdin;
18	10	\N	SOUMIS	2026-07-11 18:26:23.531674	2026-07-11 18:28:25.846986	0.00	f	100.00	\N	\N	\N	76	\N
17	10	\N	SOUMIS	2026-07-11 18:26:14.409001	2026-07-11 18:28:25.846986	0.00	f	80.00	\N	\N	\N	81	\N
19	10	\N	SOUMIS	2026-07-11 18:26:28.194041	2026-07-11 18:28:25.846986	0.00	f	100.00	ADMIS	\N	2026-07-12 18:31:43.881649	78	4
11	1	\N	SOUMIS	\N	2026-06-28 14:57:10.610313	0.00	f	\N	\N	\N	\N	3	\N
12	1	\N	SOUMIS	\N	2026-06-28 14:57:10.610313	0.00	f	\N	\N	\N	\N	5	\N
15	1	\N	SOUMIS	\N	2026-06-28 14:57:10.610313	0.00	f	\N	\N	\N	\N	4	\N
16	2	\N	BROUILLON	2026-06-30 10:49:13.146024	\N	0.00	f	\N	\N	\N	\N	2	\N
14	1	\N	SOUMIS	\N	2026-06-28 14:57:10.610313	0.00	f	96.00	ADMIS	ee	2026-07-09 15:13:02.668881	2	4
\.


--
-- Data for Name: candidature; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.candidature (id, utilisateur_id, appel_candidature_id, cree_par_utilisateur_id, raison_sociale, forme_juridique, rne_matricule_fiscal, date_creation_bureau, adresse_siege, telephone, email_principal, site_internet, ville, representant_legal, fonction_representant, specialites, agrements_certifications, banque_principale, localisation, lien_acces, token_acces, date_expiration_acces, statut, created_at, updated_at, acces_bloque, date_soumission, rne_nom_fichier, rne_chemin_fichier, rne_type_contenu, rne_taille_fichier, rne_statut, cnss_nom_fichier, cnss_chemin_fichier, cnss_type_contenu, cnss_taille_fichier, cnss_statut, type_intervenant_id, intervenant_id, nom_entreprise, adresse, profil_complete, actif) FROM stdin;
2	2	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	BROUILLON	2026-06-30 09:06:41.850139	2026-06-30 09:06:41.850139	f	\N	\N	\N	\N	\N	NON_DEPOSE	\N	\N	\N	\N	NON_DEPOSE	\N	\N	\N	\N	f	t
9	4	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	BROUILLON	2026-07-02 15:00:31.27736	2026-07-02 15:00:31.27736	f	\N	\N	\N	\N	\N	NON_DEPOSE	\N	\N	\N	\N	NON_DEPOSE	\N	\N	\N	\N	\N	\N
6	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	BROUILLON	2026-07-02 11:46:27.906511	2026-07-10 12:29:10.994628	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	12	\N	TEST	\N	f	t
12	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	BROUILLON	2026-07-13 10:17:05.196787	2026-07-13 10:17:05.196787	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	12	\N	Elite	\N	f	t
1	5	\N	\N	Bureau d’Études Atlas Ingénierie	SARL	B123456789	2020-02-24	Avenue Habib Bourguiba, Immeuble Atlas, 2ème étage	+216 71 456 789	contact@atlas-ingenierie.tn	www.atlas-ingenierie.tn	Tunis	Mohamed Ben Salem	ffff	ttt	ttttt	fff	ffff	\N	\N	\N	SOUMIS	2026-06-25 18:12:57.392301	2026-06-28 15:54:01.78622	t	2026-06-28 14:57:10.610313	janv_20 (2).pdf	uploads\\candidatures\\1\\phase1\\RNE_1782407577503_janv_20__2_.pdf	application/pdf	368316	DEPOSE	score_cv (5).pdf	uploads\\candidatures\\1\\phase1\\CNSS_1782408028224_score_cv__5_.pdf	application/pdf	845573	DEPOSE	\N	\N	\N	\N	f	t
8	9	\N	\N	Bureau d’Études Atlas Ingénierie SARL	SARL	B123456789	2021-12-18	Avenue Habib Bourguiba, Immeuble Atlas, 2ème étage	71456789	contact@atlas-ingenierie.tn	www.atlas-ingenierie.tn	Tunis	Mohamed Ben Salem	Gérant	Études structure béton armé, études VRD, fluides, électricité CFO/CFA, coordination OPC	Agrément bureau d’études bâtiment catégorie B, certification ISO 9001 en cours	BIAT	Tunis — Les Berges du Lac	\N	\N	\N	BROUILLON	2026-07-02 14:06:43.576226	2026-07-10 14:34:26.720215	f	\N	testt.pdf	uploads\\candidatures\\8\\phase1\\RNE_1783690458443_testt.pdf	application/pdf	42252	DEPOSE	\N	\N	\N	\N	NON_DEPOSE	\N	\N	\N	\N	\N	\N
7	\N	\N	\N				\N												\N	\N	\N	BROUILLON	2026-07-02 11:52:31.780977	2026-07-14 12:54:39.507731	f	\N	testt.pdf	uploads\\candidatures\\7\\phase1\\RNE_1784030079467_testt.pdf	application/pdf	42252	DEPOSE	testt.pdf	uploads\\candidatures\\7\\phase1\\CNSS_1784030079508_testt.pdf	application/pdf	42252	DEPOSE	12	\N	Bureau Atlas	\N	f	t
11	10	\N	\N	Bureau d’Études Atlas Ingénierie	SARL	B123456789	2023-02-21	Avenue Habib Bourguiba, Immeuble Atlas, 2ème étage	71456789	contact@atlas-ingenierie.tn	www.atlas-ingenierie.tn	Tunis	Mohamed Ben Salem	Gérant	testt	testt	BIAT	Tunis — Les Berges du Lac	\N	\N	\N	BROUILLON	2026-07-11 16:37:57.023448	2026-07-11 16:39:28.007034	f	\N	\N	\N	\N	\N	NON_DEPOSE	testt.pdf	uploads\\candidatures\\11\\phase1\\CNSS_1783784366639_testt.pdf	application/pdf	42252	DEPOSE	\N	\N	\N	\N	\N	\N
10	\N	\N	\N	Bureau d’Études Atlas Ingénierie	SARL	B123456789	2023-02-21	Avenue Habib Bourguiba, Immeuble Atlas, 2ème étage	71456789	contact@atlas-ingenierie.tn	\N	Tunis	Mohamed Ben Salem	Gérant	testt	testt	BIAT	Tunis — Les Berges du Lac	\N	\N	\N	SOUMIS	2026-07-11 16:36:29.987547	2026-07-11 18:28:25.842383	t	2026-07-11 18:28:25.846986	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	14	\N	Garniflex	\N	f	t
\.


--
-- Data for Name: candidature_lot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.candidature_lot (id, candidature_id, lot_id, actif, created_at) FROM stdin;
7	8	1	t	2026-07-02 14:49:32.805792
8	8	2	t	2026-07-02 14:49:32.805792
9	10	81	t	2026-07-11 16:36:30.089859
10	10	76	t	2026-07-11 16:36:30.097781
11	10	78	t	2026-07-11 16:36:30.101843
12	12	64	t	2026-07-13 10:17:05.264264
13	12	66	t	2026-07-13 10:17:05.268264
14	12	62	t	2026-07-13 10:17:05.270266
\.


--
-- Data for Name: categorie_evaluation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categorie_evaluation (id, type_intervenant_id, lot_id, code, libelle, description, actif, ordre_affichage, created_at, updated_at) FROM stdin;
11	12	2	STR-ADM	Données administratives	Informations administratives et présentation générale.	f	1	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
12	12	2	STR-EXP	Expérience spécifique	Références, expérience et complexité des projets réalisés.	f	2	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
14	12	2	STR-METH	Méthodologie	Approche méthodologique, organisation et qualité d’exécution.	f	4	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
13	12	2	STR-MOY	Moyens humains et matériels	Équipe affectée, moyens techniques et logiciels.	f	3	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
15	12	2	STR-QUAL	Qualité / BIM / outils	BIM, outils numériques, qualité et contrôle interne.	f	5	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
120	12	2	STR-TECH	Conformité technique	Respect du cahier des charges et conformité technique.	f	4	2026-07-09 17:58:00.61783	2026-07-10 09:12:59.70308
16	12	4	ELEC-ADM	Données administratives	Informations administratives et présentation générale.	f	1	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
17	12	4	ELEC-EXP	Expérience spécifique	Références, expérience et complexité des projets réalisés.	f	2	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
19	12	4	ELEC-METH	Méthodologie	Approche méthodologique, organisation et qualité d’exécution.	f	4	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
18	12	4	ELEC-MOY	Moyens humains et matériels	Équipe affectée, moyens techniques et logiciels.	f	3	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
20	12	4	ELEC-QUAL	Qualité / BIM / outils	BIM, outils numériques, qualité et contrôle interne.	f	5	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
92	12	4	ELEC-TECH	Conformité technique	Respect du cahier des charges et conformité technique.	f	4	2026-07-09 17:58:00.61783	2026-07-10 09:12:59.70308
21	12	5	OPC-ADM	Données administratives	Informations administratives et présentation générale.	f	1	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
22	12	5	OPC-EXP	Expérience spécifique	Références, expérience et complexité des projets réalisés.	f	2	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
24	12	5	OPC-METH	Méthodologie	Approche méthodologique, organisation et qualité d’exécution.	f	4	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
23	12	5	OPC-MOY	Moyens humains et matériels	Équipe affectée, moyens techniques et logiciels.	f	3	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
25	12	5	OPC-QUAL	Qualité / BIM / outils	BIM, outils numériques, qualité et contrôle interne.	f	5	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
110	12	5	OPC-TECH	Conformité technique	Respect du cahier des charges et conformité technique.	f	4	2026-07-09 17:58:00.61783	2026-07-10 09:12:59.70308
26	12	1	ARCH-ADM	Données administratives	Informations administratives et présentation générale.	f	1	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
27	12	1	ARCH-EXP	Expérience spécifique	Références, expérience et complexité des projets réalisés.	f	2	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
29	12	1	ARCH-METH	Méthodologie	Approche méthodologique, organisation et qualité d’exécution.	f	4	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
28	12	1	ARCH-MOY	Moyens humains et matériels	Équipe affectée, moyens techniques et logiciels.	f	3	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
30	12	1	ARCH-QUAL	Qualité / BIM / outils	BIM, outils numériques, qualité et contrôle interne.	f	5	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
97	12	1	ARCH-TECH	Conformité technique	Respect du cahier des charges et conformité technique.	f	4	2026-07-09 17:58:00.61783	2026-07-10 09:12:59.70308
31	12	3	FLU-ADM	Données administratives	Informations administratives et présentation générale.	f	1	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
32	12	3	FLU-EXP	Expérience spécifique	Références, expérience et complexité des projets réalisés.	f	2	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
34	12	3	FLU-METH	Méthodologie	Approche méthodologique, organisation et qualité d’exécution.	f	4	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
33	12	3	FLU-MOY	Moyens humains et matériels	Équipe affectée, moyens techniques et logiciels.	f	3	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
35	12	3	FLU-QUAL	Qualité / BIM / outils	BIM, outils numériques, qualité et contrôle interne.	f	5	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
123	12	3	FLU-TECH	Conformité technique	Respect du cahier des charges et conformité technique.	f	4	2026-07-09 17:58:00.61783	2026-07-10 09:12:59.70308
\.


--
-- Data for Name: classement_zone; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.classement_zone (id, application_candidature_id, zone_id, categorie, commentaire, actif, created_at) FROM stdin;
1	14	29	B	Classement calculé sur la meilleure référence validée : Zone 2 → catégorie B.	t	2026-07-03 13:09:48.092089
\.


--
-- Data for Name: critere_evaluation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.critere_evaluation (id, grille_evaluation_lot_id, lot_id, code_critere, section, libelle_critere, label_candidat, aide_candidat, raison_donnee, note_candidat, note_evaluateur, points_max, bareme_notation, type_notation, type_champ, options_champ, obligatoire, ordre_affichage, actif, created_at, updated_at, categorie_evaluation_id) FROM stdin;
6	1	1	ARCH-B-01	Expérience Spécifique	Projets similaires par superficie (≥ 70% superficie cible)	Projets similaires par superficie (≥ 70% superficie cible)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Attestations de MO (modèle El Emar), plans représentatifs).	Permet d’évaluer le critère « Projets similaires par superficie (≥ 70% superficie cible) » dans la catégorie « Expérience Spécifique ».	Pièces attendues : Attestations de MO (modèle El Emar), plans représentatifs.	Contrôler les pièces fournies et appliquer le barème interne.	18.00	≥ 5 projets avec superficie référence ≥ 70% du projet cible : 18 pts\n3-4 projets : 12 pts   |   1-2 projets : 6 pts   |   0 : 0 pt	MANUEL	NUMBER		t	6	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
7	1	1	ARCH-B-02	Expérience Spécifique	Zone / Localisation / Standing (projets haut de gamme / complexes)	Zone / Localisation / Standing (projets haut de gamme / complexes)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Références, attestations MO).	Permet d’évaluer le critère « Zone / Localisation / Standing (projets haut de gamme / complexes) » dans la catégorie « Expérience Spécifique ».	Pièces attendues : Références, attestations MO.	Contrôler les pièces fournies et appliquer le barème interne.	14.00	≥ 3 projets classement national/international OU projets contraintes complexes : 14 pts\n1-2 projets : 8 pts   |   0 : 0 pt	MANUEL	NUMBER		t	7	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
8	1	1	ARCH-B-03	Expérience Spécifique	Type de projet similaire (résidentiel haut gamme, hôtellerie, bureau…)	Type de projet similaire (résidentiel haut gamme, hôtellerie, bureau…)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Fiches projets, références).	Permet d’évaluer le critère « Type de projet similaire (résidentiel haut gamme, hôtellerie, bureau…) » dans la catégorie « Expérience Spécifique ».	Pièces attendues : Fiches projets, références.	Contrôler les pièces fournies et appliquer le barème interne.	8.00	Projets : résidentiel, bureaux, hôtellerie, santé [hors usines/écoles] : 8 pts\nAutres types : 4 pts	MANUEL	SELECT	Même type;Types voisins;Autres	t	8	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
9	1	1	ARCH-C-01	Compétence BIM	Nombre de projets BIM réalisés (≥ 2 projets)	Nombre de projets BIM réalisés (≥ 2 projets)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Liste projets BIM).	Permet d’évaluer le critère « Nombre de projets BIM réalisés (≥ 2 projets) » dans la catégorie « Compétence BIM ».	Pièces attendues : Liste projets BIM.	Contrôler les pièces fournies et appliquer le barème interne.	4.00	≥ 2 projets BIM achevés : 4 pts   |   1 projet : 2 pts   |   0 : 0 pt	MANUEL	NUMBER		t	9	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
10	1	1	ARCH-C-02	Compétence BIM	Licence BIM valide à la date d'évaluation	Licence BIM valide à la date d'évaluation	Renseigner ce champ et joindre les pièces justificatives nécessaires (Copie de la licence BIM).	Permet d’évaluer le critère « Licence BIM valide à la date d'évaluation » dans la catégorie « Compétence BIM ».	Pièces attendues : Copie de la licence BIM.	Contrôler les pièces fournies et appliquer le barème interne.	2.00	Licence BIM valide : 2 pts   |   Non : 0 pt	MANUEL	BOOLEAN		t	10	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
11	1	1	ARCH-C-03	Compétence BIM	Spécialiste BIM ≤ 5 ans d'expérience	Spécialiste BIM ≤ 5 ans d'expérience	Renseigner ce champ et joindre les pièces justificatives nécessaires (CV détaillé du spécialiste BIM).	Permet d’évaluer le critère « Spécialiste BIM ≤ 5 ans d'expérience » dans la catégorie « Compétence BIM ».	Pièces attendues : CV détaillé du spécialiste BIM.	Contrôler les pièces fournies et appliquer le barème interne.	4.00	> 5 ans expérience BIM : 4 pts   |   3-5 ans : 2 pts   |   < 3 ans : 0 pt	MANUEL	NUMBER		t	11	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
12	1	1	ARCH-C-04	Compétence BIM	Expérience du spécialiste BIM sur projets (≥ 1 projet)	Expérience du spécialiste BIM sur projets (≥ 1 projet)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Références projets BIM du spécialiste).	Permet d’évaluer le critère « Expérience du spécialiste BIM sur projets (≥ 1 projet) » dans la catégorie « Compétence BIM ».	Pièces attendues : Références projets BIM du spécialiste.	Contrôler les pièces fournies et appliquer le barème interne.	6.00	≥ 1 projet BIM réalisé par ce spécialiste : 6 pts   |   0 : 0 pt	MANUEL	NUMBER		t	12	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
13	1	1	ARCH-C-05	Compétence BIM	Nombre de spécialistes BIM dans le bureau (≥ 2)	Nombre de spécialistes BIM dans le bureau (≥ 2)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Liste des employés BIM).	Permet d’évaluer le critère « Nombre de spécialistes BIM dans le bureau (≥ 2) » dans la catégorie « Compétence BIM ».	Pièces attendues : Liste des employés BIM.	Contrôler les pièces fournies et appliquer le barème interne.	4.00	≥ 2 spécialistes BIM : 4 pts   |   1 : 2 pts   |   0 : 0 pt	MANUEL	NUMBER		t	13	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
14	2	2	STR-A-01	Appréciation Du Bureau	Ancienneté du bureau / responsable principal (≥ 15 ans)	Ancienneté du bureau / responsable principal (≥ 15 ans)	Renseigner ce champ et joindre les pièces justificatives nécessaires (CV du responsable principal).	Permet d’évaluer le critère « Ancienneté du bureau / responsable principal (≥ 15 ans) » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : CV du responsable principal.	Contrôler les pièces fournies et appliquer le barème interne.	8.00	Responsable principal ≥ 15 ans expérience : 8 pts\n10-14 ans : 5 pts   |   < 10 ans : 0 pt	MANUEL	NUMBER		t	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
15	2	2	STR-A-02	Appréciation Du Bureau	Structure du bureau (≥ 3 ingénieurs permanents)	Structure du bureau (≥ 3 ingénieurs permanents)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Organigramme complet).	Permet d’évaluer le critère « Structure du bureau (≥ 3 ingénieurs permanents) » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : Organigramme complet.	Contrôler les pièces fournies et appliquer le barème interne.	8.00	≥ 3 ingénieurs permanents : 8 pts   |   1-2 : 4 pts   |   0 : 0 pt	MANUEL	NUMBER		t	2	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
16	2	2	STR-A-03	Appréciation Du Bureau	Bureau multidisciplinaire	Bureau multidisciplinaire	Renseigner ce champ et joindre les pièces justificatives nécessaires (Organigramme).	Permet d’évaluer le critère « Bureau multidisciplinaire » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : Organigramme.	Contrôler les pièces fournies et appliquer le barème interne.	0.00	Information – non valorisée (éliminatoire si mono spécialisé uniquement)	MANUEL	BOOLEAN		t	3	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
17	2	2	STR-A-04	Appréciation Du Bureau	Qualité et conformité du dossier	Qualité et conformité du dossier	Renseigner ce champ et joindre les pièces justificatives nécessaires (Copie du dossier).	Permet d’évaluer le critère « Qualité et conformité du dossier » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : Copie du dossier.	Contrôler les pièces fournies et appliquer le barème interne.	4.00	Dossier complet, clair, conforme : 4 pts   |   Non conforme : 0 pt	MANUEL	BOOLEAN		t	4	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
18	2	2	STR-A-05	Appréciation Du Bureau	Ingénieur chef de projet (≥ 10 ans d'expérience)	Ingénieur chef de projet (≥ 10 ans d'expérience)	Renseigner ce champ et joindre les pièces justificatives nécessaires (CV ingénieur chef de projet).	Permet d’évaluer le critère « Ingénieur chef de projet (≥ 10 ans d'expérience) » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : CV ingénieur chef de projet.	Contrôler les pièces fournies et appliquer le barème interne.	10.00	Ingénieur chef de projet ≥ 10 ans : 10 pts   |   5-9 ans : 6 pts   |   < 5 ans : 0 pt	MANUEL	NUMBER		t	5	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
19	2	2	STR-B-01	Expérience Spécifique	Projets similaires par superficie (≥ 70% superficie cible)	Projets similaires par superficie (≥ 70% superficie cible)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Attestations MO (modèle El Emar), plans).	Permet d’évaluer le critère « Projets similaires par superficie (≥ 70% superficie cible) » dans la catégorie « Expérience Spécifique ».	Pièces attendues : Attestations MO (modèle El Emar), plans.	Contrôler les pièces fournies et appliquer le barème interne.	18.00	≥ 5 projets superficie ≥ 70% : 18 pts   |   3-4 : 12 pts   |   1-2 : 6 pts   |   0 : 0 pt	MANUEL	NUMBER		t	6	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
20	2	2	STR-B-02	Expérience Spécifique	Zone / Standing / Complexité (fondations spéciales, sous-sols ≥ 2, façades complexes…)	Zone / Standing / Complexité (fondations spéciales, sous-sols ≥ 2, façades complexes…)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Références, attestations MO, plans techniques).	Permet d’évaluer le critère « Zone / Standing / Complexité (fondations spéciales, sous-sols ≥ 2, façades complexes…) » dans la catégorie « Expérience Spécifique ».	Pièces attendues : Références, attestations MO, plans techniques.	Contrôler les pièces fournies et appliquer le barème interne.	28.00	≥ 5 projets avec éléments complexes : 28 pts\n3-4 : 18 pts   |   1-2 : 10 pts   |   0 : 0 pt	MANUEL	NUMBER		t	7	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
21	2	2	STR-B-03	Expérience Spécifique	Type de projet similaire (résidentiel, bureaux, hôtellerie, santé)	Type de projet similaire (résidentiel, bureaux, hôtellerie, santé)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Fiches projets).	Permet d’évaluer le critère « Type de projet similaire (résidentiel, bureaux, hôtellerie, santé) » dans la catégorie « Expérience Spécifique ».	Pièces attendues : Fiches projets.	Contrôler les pièces fournies et appliquer le barème interne.	8.00	Projets similaires mêmes types : 8 pts   |   Types différents : 4 pts	MANUEL	SELECT	Même type;Types voisins;Autres	t	8	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
22	2	2	STR-C-01	Compétence BIM	Nombre de projets BIM structure réalisés (≥ 2)	Nombre de projets BIM structure réalisés (≥ 2)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Liste projets BIM).	Permet d’évaluer le critère « Nombre de projets BIM structure réalisés (≥ 2) » dans la catégorie « Compétence BIM ».	Pièces attendues : Liste projets BIM.	Contrôler les pièces fournies et appliquer le barème interne.	4.00	≥ 2 projets BIM : 4 pts   |   1 : 2 pts   |   0 : 0 pt	MANUEL	NUMBER		t	9	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
23	2	2	STR-C-02	Compétence BIM	Licence BIM valide	Licence BIM valide	Renseigner ce champ et joindre les pièces justificatives nécessaires (Copie licence BIM).	Permet d’évaluer le critère « Licence BIM valide » dans la catégorie « Compétence BIM ».	Pièces attendues : Copie licence BIM.	Contrôler les pièces fournies et appliquer le barème interne.	2.00	Licence valide : 2 pts   |   Non : 0 pt	MANUEL	BOOLEAN		t	10	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
24	2	2	STR-C-03	Compétence BIM	Spécialiste BIM (≤ 5 ans expérience)	Spécialiste BIM (≤ 5 ans expérience)	Renseigner ce champ et joindre les pièces justificatives nécessaires (CV spécialiste BIM).	Permet d’évaluer le critère « Spécialiste BIM (≤ 5 ans expérience) » dans la catégorie « Compétence BIM ».	Pièces attendues : CV spécialiste BIM.	Contrôler les pièces fournies et appliquer le barème interne.	3.00	> 5 ans : 3 pts   |   3-5 ans : 1 pt   |   < 3 ans : 0 pt	MANUEL	NUMBER		t	11	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
25	2	2	STR-C-04	Compétence BIM	Expérience spécialiste BIM sur projets (≥ 1 projet)	Expérience spécialiste BIM sur projets (≥ 1 projet)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Références BIM du spécialiste).	Permet d’évaluer le critère « Expérience spécialiste BIM sur projets (≥ 1 projet) » dans la catégorie « Compétence BIM ».	Pièces attendues : Références BIM du spécialiste.	Contrôler les pièces fournies et appliquer le barème interne.	5.00	≥ 1 projet BIM par ce spécialiste : 5 pts   |   0 : 0 pt	MANUEL	NUMBER		t	12	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
26	2	2	STR-C-05	Compétence BIM	Nombre de spécialistes BIM (≥ 2)	Nombre de spécialistes BIM (≥ 2)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Liste employés BIM).	Permet d’évaluer le critère « Nombre de spécialistes BIM (≥ 2) » dans la catégorie « Compétence BIM ».	Pièces attendues : Liste employés BIM.	Contrôler les pièces fournies et appliquer le barème interne.	2.00	≥ 2 spécialistes : 2 pts   |   1 : 1 pt   |   0 : 0 pt	MANUEL	NUMBER		t	13	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
27	3	3	FLU-A-01	Appréciation Du Bureau	Ancienneté / expérience responsable (≥ 15 ans)	Ancienneté / expérience responsable (≥ 15 ans)	Renseigner ce champ et joindre les pièces justificatives nécessaires (CV responsable principal).	Permet d’évaluer le critère « Ancienneté / expérience responsable (≥ 15 ans) » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : CV responsable principal.	Contrôler les pièces fournies et appliquer le barème interne.	8.00	Responsable ≥ 15 ans expérience et bureau ≥ 15 ans : 8 pts\n10-14 ans : 5 pts   |   < 10 ans : 0 pt	MANUEL	NUMBER		t	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
28	3	3	FLU-A-02	Appréciation Du Bureau	Effectif permanent (≥ 3 ingénieurs)	Effectif permanent (≥ 3 ingénieurs)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Organigramme complet).	Permet d’évaluer le critère « Effectif permanent (≥ 3 ingénieurs) » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : Organigramme complet.	Contrôler les pièces fournies et appliquer le barème interne.	8.00	≥ 3 ingénieurs permanents : 8 pts   |   1-2 : 4 pts   |   0 : 0 pt	MANUEL	NUMBER		t	2	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
29	3	3	FLU-A-03	Appréciation Du Bureau	Bureau multidisciplinaire	Bureau multidisciplinaire	Renseigner ce champ et joindre les pièces justificatives nécessaires (Organigramme).	Permet d’évaluer le critère « Bureau multidisciplinaire » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : Organigramme.	Contrôler les pièces fournies et appliquer le barème interne.	0.00	Information – non valorisée	MANUEL	BOOLEAN		t	3	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
30	3	3	FLU-A-04	Appréciation Du Bureau	Qualité et conformité du dossier	Qualité et conformité du dossier	Renseigner ce champ et joindre les pièces justificatives nécessaires (Copie du dossier).	Permet d’évaluer le critère « Qualité et conformité du dossier » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : Copie du dossier.	Contrôler les pièces fournies et appliquer le barème interne.	4.00	Complet et conforme : 4 pts   |   Non conforme : 0 pt	MANUEL	BOOLEAN		t	4	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
31	3	3	FLU-A-05	Appréciation Du Bureau	Ingénieur chef de projet (≥ 10 ans)	Ingénieur chef de projet (≥ 10 ans)	Renseigner ce champ et joindre les pièces justificatives nécessaires (CV ingénieur chef de projet).	Permet d’évaluer le critère « Ingénieur chef de projet (≥ 10 ans) » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : CV ingénieur chef de projet.	Contrôler les pièces fournies et appliquer le barème interne.	10.00	≥ 10 ans expérience : 10 pts   |   5-9 ans : 6 pts   |   < 5 ans : 0 pt	MANUEL	NUMBER		t	5	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
4	1	1	ARCH-A-04	Appréciation Du Bureau	Qualité et conformité du dossier de candidature	Qualité et conformité du dossier de candidature	Renseigner ce champ et joindre les pièces justificatives nécessaires (Copie du dossier remis).	Permet d’évaluer le critère « Qualité et conformité du dossier de candidature » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : Copie du dossier remis.	Contrôler les pièces fournies et appliquer le barème interne.	4.00	Dossier complet, clair, conforme aux exigences : 4 pts\nIncomplet ou non conforme : 0 pt	MANUEL	BOOLEAN		t	4	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
32	3	3	FLU-B-01	Expérience Spécifique	Projets similaires par superficie (≥ 70% superficie cible)	Projets similaires par superficie (≥ 70% superficie cible)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Attestations MO, plans fluides).	Permet d’évaluer le critère « Projets similaires par superficie (≥ 70% superficie cible) » dans la catégorie « Expérience Spécifique ».	Pièces attendues : Attestations MO, plans fluides.	Contrôler les pièces fournies et appliquer le barème interne.	18.00	≥ 5 projets superficie ≥ 70% : 18 pts   |   3-4 : 12 pts   |   1-2 : 6 pts   |   0 : 0 pt	MANUEL	NUMBER		t	6	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
33	3	3	FLU-B-02	Expérience Spécifique	Zone / Standing / Complexité (CVC+SSI+GTB+plomberie, hôtels, hôpitaux…)	Zone / Standing / Complexité (CVC+SSI+GTB+plomberie, hôtels, hôpitaux…)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Attestations MO, CCTP, contrats).	Permet d’évaluer le critère « Zone / Standing / Complexité (CVC+SSI+GTB+plomberie, hôtels, hôpitaux…) » dans la catégorie « Expérience Spécifique ».	Pièces attendues : Attestations MO, CCTP, contrats.	Contrôler les pièces fournies et appliquer le barème interne.	18.00	≥ 5 projets niveau technique 1 (CVC+SSI+GTB+plomberie) : 18 pts\n3-4 : 12 pts   |   1-2 : 6 pts   |   0 : 0 pt\nNiveau 1 = CVC + plomberie + SSI + VRV + GTB	MANUEL	NUMBER		t	7	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
34	3	3	FLU-B-03	Expérience Spécifique	Type de projet similaire (résidentiel, bureaux, hôtellerie, santé)	Type de projet similaire (résidentiel, bureaux, hôtellerie, santé)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Fiches projets).	Permet d’évaluer le critère « Type de projet similaire (résidentiel, bureaux, hôtellerie, santé) » dans la catégorie « Expérience Spécifique ».	Pièces attendues : Fiches projets.	Contrôler les pièces fournies et appliquer le barème interne.	18.00	Même type : 18 pts   |   Types voisins : 10 pts   |   Autres : 0 pt	MANUEL	SELECT	Même type;Types voisins;Autres	t	8	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
35	3	3	FLU-C-01	Compétence BIM	Projets BIM fluides réalisés (≥ 2)	Projets BIM fluides réalisés (≥ 2)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Liste projets BIM).	Permet d’évaluer le critère « Projets BIM fluides réalisés (≥ 2) » dans la catégorie « Compétence BIM ».	Pièces attendues : Liste projets BIM.	Contrôler les pièces fournies et appliquer le barème interne.	4.00	≥ 2 projets : 4 pts   |   1 : 2 pts   |   0 : 0 pt	MANUEL	NUMBER		t	9	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
36	3	3	FLU-C-02	Compétence BIM	Certification BIM valide	Certification BIM valide	Renseigner ce champ et joindre les pièces justificatives nécessaires (Copie certification).	Permet d’évaluer le critère « Certification BIM valide » dans la catégorie « Compétence BIM ».	Pièces attendues : Copie certification.	Contrôler les pièces fournies et appliquer le barème interne.	2.00	Valide : 2 pts   |   Non : 0 pt	MANUEL	BOOLEAN		t	10	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
37	3	3	FLU-C-03	Compétence BIM	Spécialiste BIM (≤ 5 ans expérience)	Spécialiste BIM (≤ 5 ans expérience)	Renseigner ce champ et joindre les pièces justificatives nécessaires (CV spécialiste BIM).	Permet d’évaluer le critère « Spécialiste BIM (≤ 5 ans expérience) » dans la catégorie « Compétence BIM ».	Pièces attendues : CV spécialiste BIM.	Contrôler les pièces fournies et appliquer le barème interne.	3.00	> 5 ans : 3 pts   |   3-5 : 1 pt   |   < 3 : 0 pt	MANUEL	NUMBER		t	11	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
38	3	3	FLU-C-04	Compétence BIM	Expérience spécialiste BIM projets (≥ 1)	Expérience spécialiste BIM projets (≥ 1)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Références BIM du spécialiste).	Permet d’évaluer le critère « Expérience spécialiste BIM projets (≥ 1) » dans la catégorie « Compétence BIM ».	Pièces attendues : Références BIM du spécialiste.	Contrôler les pièces fournies et appliquer le barème interne.	5.00	≥ 1 projet : 5 pts   |   0 : 0 pt	MANUEL	NUMBER		t	12	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
39	3	3	FLU-C-05	Compétence BIM	Nombre de spécialistes BIM (≥ 2)	Nombre de spécialistes BIM (≥ 2)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Liste employés BIM).	Permet d’évaluer le critère « Nombre de spécialistes BIM (≥ 2) » dans la catégorie « Compétence BIM ».	Pièces attendues : Liste employés BIM.	Contrôler les pièces fournies et appliquer le barème interne.	2.00	≥ 2 : 2 pts   |   1 : 1 pt   |   0 : 0 pt	MANUEL	NUMBER		t	13	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
40	4	4	ELEC-A-01	Appréciation Du Bureau	Ancienneté / expérience responsable (≥ 15 ans)	Ancienneté / expérience responsable (≥ 15 ans)	Renseigner ce champ et joindre les pièces justificatives nécessaires (CV responsable principal).	Permet d’évaluer le critère « Ancienneté / expérience responsable (≥ 15 ans) » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : CV responsable principal.	Contrôler les pièces fournies et appliquer le barème interne.	8.00	Responsable ≥ 15 ans : 8 pts   |   10-14 ans : 5 pts   |   < 10 ans : 0 pt	MANUEL	NUMBER		t	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
41	4	4	ELEC-A-02	Appréciation Du Bureau	Effectif permanent (≥ 3 ingénieurs)	Effectif permanent (≥ 3 ingénieurs)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Organigramme complet).	Permet d’évaluer le critère « Effectif permanent (≥ 3 ingénieurs) » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : Organigramme complet.	Contrôler les pièces fournies et appliquer le barème interne.	8.00	≥ 3 ingénieurs permanents : 8 pts   |   1-2 : 4 pts   |   0 : 0 pt	MANUEL	NUMBER		t	2	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
42	4	4	ELEC-A-03	Appréciation Du Bureau	Bureau multidisciplinaire	Bureau multidisciplinaire	Renseigner ce champ et joindre les pièces justificatives nécessaires (Organigramme).	Permet d’évaluer le critère « Bureau multidisciplinaire » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : Organigramme.	Contrôler les pièces fournies et appliquer le barème interne.	0.00	Information – non valorisée	MANUEL	BOOLEAN		t	3	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
43	4	4	ELEC-A-04	Appréciation Du Bureau	Qualité et conformité du dossier	Qualité et conformité du dossier	Renseigner ce champ et joindre les pièces justificatives nécessaires (Copie du dossier).	Permet d’évaluer le critère « Qualité et conformité du dossier » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : Copie du dossier.	Contrôler les pièces fournies et appliquer le barème interne.	4.00	Complet et conforme : 4 pts   |   Non conforme : 0 pt	MANUEL	BOOLEAN		t	4	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
44	4	4	ELEC-A-05	Appréciation Du Bureau	Ingénieur chef de projet (≥ 10 ans)	Ingénieur chef de projet (≥ 10 ans)	Renseigner ce champ et joindre les pièces justificatives nécessaires (CV ingénieur chef de projet).	Permet d’évaluer le critère « Ingénieur chef de projet (≥ 10 ans) » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : CV ingénieur chef de projet.	Contrôler les pièces fournies et appliquer le barème interne.	10.00	≥ 10 ans : 10 pts   |   5-9 ans : 6 pts   |   < 5 ans : 0 pt	MANUEL	NUMBER		t	5	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
45	4	4	ELEC-B-01	Expérience Spécifique	Projets similaires par superficie (≥ 70% superficie cible)	Projets similaires par superficie (≥ 70% superficie cible)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Attestations MO, plans électricité).	Permet d’évaluer le critère « Projets similaires par superficie (≥ 70% superficie cible) » dans la catégorie « Expérience Spécifique ».	Pièces attendues : Attestations MO, plans électricité.	Contrôler les pièces fournies et appliquer le barème interne.	18.00	≥ 5 projets superficie ≥ 70% : 18 pts   |   3-4 : 12 pts   |   1-2 : 6 pts   |   0 : 0 pt	MANUEL	NUMBER		t	6	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
46	4	4	ELEC-B-02	Expérience Spécifique	Zone / Standing / Complexité (HT/MT, TGBT, SSI, GTB, data centers, hôtels…)	Zone / Standing / Complexité (HT/MT, TGBT, SSI, GTB, data centers, hôtels…)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Attestations MO, CCTP, contrats).	Permet d’évaluer le critère « Zone / Standing / Complexité (HT/MT, TGBT, SSI, GTB, data centers, hôtels…) » dans la catégorie « Expérience Spécifique ».	Pièces attendues : Attestations MO, CCTP, contrats.	Contrôler les pièces fournies et appliquer le barème interne.	18.00	≥ 5 projets niveau 1 (HT/MT + TGBT + GTB + SSI) : 18 pts\n3-4 : 12 pts   |   1-2 : 6 pts   |   0 : 0 pt\nNiveau 1 = HT/MT + TGBT + SSI + GTB (hôtels, hôpitaux, data centers)	MANUEL	NUMBER		t	7	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
47	4	4	ELEC-B-03	Expérience Spécifique	Type de projet similaire	Type de projet similaire	Renseigner ce champ et joindre les pièces justificatives nécessaires (Fiches projets, attestations).	Permet d’évaluer le critère « Type de projet similaire » dans la catégorie « Expérience Spécifique ».	Pièces attendues : Fiches projets, attestations.	Contrôler les pièces fournies et appliquer le barème interne.	18.00	Projets mêmes types : 18 pts   |   Types voisins : 10 pts   |   Autres : 0 pt	MANUEL	SELECT	Même type;Types voisins;Autres	t	8	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
48	4	4	ELEC-C-01	Compétence BIM	Projets BIM électricité réalisés (≥ 2)	Projets BIM électricité réalisés (≥ 2)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Liste projets BIM).	Permet d’évaluer le critère « Projets BIM électricité réalisés (≥ 2) » dans la catégorie « Compétence BIM ».	Pièces attendues : Liste projets BIM.	Contrôler les pièces fournies et appliquer le barème interne.	4.00	≥ 2 projets : 4 pts   |   1 : 2 pts   |   0 : 0 pt	MANUEL	NUMBER		t	9	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
49	4	4	ELEC-C-02	Compétence BIM	Certification BIM valide	Certification BIM valide	Renseigner ce champ et joindre les pièces justificatives nécessaires (Copie certification).	Permet d’évaluer le critère « Certification BIM valide » dans la catégorie « Compétence BIM ».	Pièces attendues : Copie certification.	Contrôler les pièces fournies et appliquer le barème interne.	2.00	Valide : 2 pts   |   Non : 0 pt	MANUEL	BOOLEAN		t	10	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
50	4	4	ELEC-C-03	Compétence BIM	Spécialiste BIM (≤ 5 ans expérience)	Spécialiste BIM (≤ 5 ans expérience)	Renseigner ce champ et joindre les pièces justificatives nécessaires (CV spécialiste BIM).	Permet d’évaluer le critère « Spécialiste BIM (≤ 5 ans expérience) » dans la catégorie « Compétence BIM ».	Pièces attendues : CV spécialiste BIM.	Contrôler les pièces fournies et appliquer le barème interne.	3.00	> 5 ans : 3 pts   |   3-5 : 1 pt   |   < 3 : 0 pt	MANUEL	NUMBER		t	11	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
51	4	4	ELEC-C-04	Compétence BIM	Expérience spécialiste BIM projets (≥ 1)	Expérience spécialiste BIM projets (≥ 1)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Références BIM du spécialiste).	Permet d’évaluer le critère « Expérience spécialiste BIM projets (≥ 1) » dans la catégorie « Compétence BIM ».	Pièces attendues : Références BIM du spécialiste.	Contrôler les pièces fournies et appliquer le barème interne.	5.00	≥ 1 projet : 5 pts   |   0 : 0 pt	MANUEL	NUMBER		t	12	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
52	4	4	ELEC-C-05	Compétence BIM	Nombre de spécialistes BIM (≥ 2)	Nombre de spécialistes BIM (≥ 2)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Liste employés BIM).	Permet d’évaluer le critère « Nombre de spécialistes BIM (≥ 2) » dans la catégorie « Compétence BIM ».	Pièces attendues : Liste employés BIM.	Contrôler les pièces fournies et appliquer le barème interne.	2.00	≥ 2 : 2 pts   |   1 : 1 pt   |   0 : 0 pt	MANUEL	NUMBER		t	13	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
53	5	5	OPC-A-01	Appréciation Du Bureau	Ancienneté et expérience du responsable	Ancienneté et expérience du responsable	Renseigner ce champ et joindre les pièces justificatives nécessaires (Justificatif ancienneté et expérience du responsable).	Permet d’évaluer le critère « Ancienneté et expérience du responsable » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : Justificatif ancienneté et expérience du responsable.	Contrôler les pièces fournies et appliquer le barème interne.	15.00	Responsable principal avec expérience significative : 15 pts | expérience moyenne : 8 pts | insuffisant : 0 pt	MANUEL	NUMBER		t	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
54	5	5	OPC-A-02	Appréciation Du Bureau	Équipe permanente OPC	Équipe permanente OPC	Renseigner ce champ et joindre les pièces justificatives nécessaires (CV et organigramme équipe OPC).	Permet d’évaluer le critère « Équipe permanente OPC » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : CV et organigramme équipe OPC.	Contrôler les pièces fournies et appliquer le barème interne.	15.00	Équipe OPC complète et permanente : 15 pts | équipe partielle : 8 pts | insuffisant : 0 pt	MANUEL	NUMBER		t	2	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
55	5	5	OPC-A-03	Appréciation Du Bureau	Chef de projet OPC désigné	Chef de projet OPC désigné	Renseigner ce champ et joindre les pièces justificatives nécessaires (CV chef de projet OPC).	Permet d’évaluer le critère « Chef de projet OPC désigné » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : CV chef de projet OPC.	Contrôler les pièces fournies et appliquer le barème interne.	15.00	Chef de projet OPC expérimenté : 15 pts | expérience moyenne : 8 pts | insuffisant : 0 pt	MANUEL	NUMBER		t	3	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
56	5	5	OPC-D-01	Maturité Numérique Et Outils	Logiciels de planning (MS Project / Primavera / autres)	Logiciels de planning (MS Project / Primavera / autres)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Liste logiciels de planning).	Permet d’évaluer le critère « Logiciels de planning (MS Project / Primavera / autres) » dans la catégorie « Maturité Numérique Et Outils ».	Pièces attendues : Liste logiciels de planning.	Contrôler les pièces fournies et appliquer le barème interne.	15.00	Outils professionnels maîtrisés : 15 pts | outils simples : 8 pts | aucun outil : 0 pt	MANUEL	SELECT	MS Project;Primavera;Autres outils;Aucun	t	4	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
57	5	5	OPC-D-02	Maturité Numérique Et Outils	Outils numériques de suivi et de reporting	Outils numériques de suivi et de reporting	Renseigner ce champ et joindre les pièces justificatives nécessaires (Exemples de tableaux de bord ou rapports).	Permet d’évaluer le critère « Outils numériques de suivi et de reporting » dans la catégorie « Maturité Numérique Et Outils ».	Pièces attendues : Exemples de tableaux de bord ou rapports.	Contrôler les pièces fournies et appliquer le barème interne.	15.00	Outils de suivi + tableaux de bord : 15 pts | suivi partiel : 8 pts | insuffisant : 0 pt	MANUEL	TEXTAREA		t	5	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
58	5	5	OPC-D-03	Maturité Numérique Et Outils	BIM / coordination 4D	BIM / coordination 4D	Renseigner ce champ et joindre les pièces justificatives nécessaires (Références BIM ou coordination 4D).	Permet d’évaluer le critère « BIM / coordination 4D » dans la catégorie « Maturité Numérique Et Outils ».	Pièces attendues : Références BIM ou coordination 4D.	Contrôler les pièces fournies et appliquer le barème interne.	15.00	Utilisation BIM/4D confirmée : 15 pts | utilisation partielle : 8 pts | non : 0 pt	MANUEL	BOOLEAN		t	6	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
59	5	5	OPC-D-04	Maturité Numérique Et Outils	GED — Gestion Électronique des Documents	GED — Gestion Électronique des Documents	Renseigner ce champ et joindre les pièces justificatives nécessaires (Exemple GED ou plateforme collaborative).	Permet d’évaluer le critère « GED — Gestion Électronique des Documents » dans la catégorie « Maturité Numérique Et Outils ».	Pièces attendues : Exemple GED ou plateforme collaborative.	Contrôler les pièces fournies et appliquer le barème interne.	10.00	GED ou plateforme collaborative utilisée : 10 pts | usage partiel : 5 pts | non : 0 pt	MANUEL	BOOLEAN		t	7	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
213	51	72	PDF-A3-ELEC-03	BIM	Maturité BIM	Maturité BIM	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	5.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
3	1	1	ARCH-A-03	Appréciation Du Bureau	Bureau multidisciplinaire (urbanisme, paysage, BET…)	Bureau multidisciplinaire (urbanisme, paysage, BET…)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Organigramme, Conventions de partenariat).	Permet d’évaluer le critère « Bureau multidisciplinaire (urbanisme, paysage, BET…) » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : Organigramme, Conventions de partenariat.	Contrôler les pièces fournies et appliquer le barème interne.	4.00	Disciplines complémentaires intégrées ou partenariats formels : 4 pts\nMonodisciplinaire : 0 pt	MANUEL	BOOLEAN		t	3	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
2	1	1	ARCH-A-02	Appréciation Du Bureau	Structure et effectif permanent	Structure et effectif permanent	Renseigner ce champ et joindre les pièces justificatives nécessaires (Organigramme complet, fiches de poste).	Permet d’évaluer le critère « Structure et effectif permanent » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : Organigramme complet, fiches de poste.	Contrôler les pièces fournies et appliquer le barème interne.	8.00	Équipe stable (architectes + designers permanents) : 8 pts\nFreelances uniquement : 0 pt	MANUEL	NUMBER		t	2	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
5	1	1	ARCH-A-05	Appréciation Du Bureau	Chef de projet désigné (≥ 10 ans d'expérience)	Chef de projet désigné (≥ 10 ans d'expérience)	Renseigner ce champ et joindre les pièces justificatives nécessaires (CV détaillé de l'architecte chef de projet).	Permet d’évaluer le critère « Chef de projet désigné (≥ 10 ans d'expérience) » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : CV détaillé de l'architecte chef de projet.	Contrôler les pièces fournies et appliquer le barème interne.	16.00	Architecte chef de projet ≥ 10 ans, disponible, max 2 projets simultanés : 16 pts\n5-9 ans : 10 pts   |   < 5 ans : 0 pt	MANUEL	NUMBER		t	5	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
64	2	2	STR-EXP-01	Expérience spécifique	Expérience générale en études de structure	Expérience générale en études de structure	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	15.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	12
65	2	2	STR-EXP-03	Expérience spécifique	Références similaires et attestations du maître d’ouvrage	Références similaires et attestations du maître d’ouvrage	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	15.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	4	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	12
66	4	4	ELEC-MOY-01	Moyens humains et matériels	Équipe Électricité, moyens techniques et logiciels utilisés	Équipe Électricité, moyens techniques et logiciels utilisés	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	10.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	4	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	18
67	4	4	ELEC-QUAL-01	Qualité / BIM / outils	Respect des normes électriques et contrôle qualité	Respect des normes électriques et contrôle qualité	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	15.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	6	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	20
68	3	3	FLU-EXP-02	Expérience spécifique	Références HVAC, plomberie, sanitaire et protection incendie	Références HVAC, plomberie, sanitaire et protection incendie	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	32
69	3	3	FLU-MOY-01	Moyens humains et matériels	Équipe Fluides, moyens techniques et logiciels utilisés	Équipe Fluides, moyens techniques et logiciels utilisés	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	10.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	4	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	33
70	2	2	STR-ADM-01	Données administratives	Présentation du bureau et organisation de l’équipe Structure	Présentation du bureau et organisation de l’équipe Structure	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	10.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	11
71	5	5	OPC-RISK-01	Méthodologie	Gestion des risques, retards, interfaces et points bloquants	Gestion des risques, retards, interfaces et points bloquants	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	10.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	6	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	24
72	1	1	ARCH-METH-01	Méthodologie	Méthodologie de conception, coordination et production des livrables	Méthodologie de conception, coordination et production des livrables	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	15.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	6	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	29
73	4	4	ELEC-ADM-01	Données administratives	Présentation du bureau et organisation de l’équipe Électricité	Présentation du bureau et organisation de l’équipe Électricité	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	10.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	16
74	2	2	STR-METH-01	Méthodologie	Méthodologie de calcul, notes techniques et contrôle interne	Méthodologie de calcul, notes techniques et contrôle interne	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	15.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	6	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	14
75	4	4	ELEC-EXP-02	Expérience spécifique	Références CFO / CFA / sécurité incendie / courants faibles	Références CFO / CFA / sécurité incendie / courants faibles	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	17
76	4	4	ELEC-BIM-01	Qualité / BIM / outils	Maîtrise BIM Électricité et outils numériques	Maîtrise BIM Électricité et outils numériques	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	10.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	SELECT	Faible;Moyen;Bon;Excellent	t	7	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	20
77	5	5	OPC-METH-01	Méthodologie	Méthodologie de planification, coordination et suivi chantier	Méthodologie de planification, coordination et suivi chantier	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	5	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	24
78	3	3	FLU-BIM-01	Qualité / BIM / outils	Maîtrise BIM Fluides et outils numériques	Maîtrise BIM Fluides et outils numériques	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	10.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	SELECT	Faible;Moyen;Bon;Excellent	t	7	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	35
79	1	1	ARCH-QUAL-01	Qualité / BIM / outils	Maîtrise BIM, outils numériques et contrôle qualité	Maîtrise BIM, outils numériques et contrôle qualité	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	15.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	SELECT	Faible;Moyen;Bon;Excellent	t	7	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	30
80	4	4	ELEC-EXP-01	Expérience spécifique	Expérience générale en études électriques	Expérience générale en études électriques	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	15.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	17
81	2	2	STR-QUAL-01	Qualité / BIM / outils	Logiciels de calcul, BIM structure et qualité des livrables	Logiciels de calcul, BIM structure et qualité des livrables	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	15.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	SELECT	Faible;Moyen;Bon;Excellent	t	7	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	15
82	1	1	ARCH-EXP-03	Expérience spécifique	Attestations du maître d’ouvrage pour les références présentées	Attestations du maître d’ouvrage pour les références présentées	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	15.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	BOOLEAN	\N	t	4	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	27
83	2	2	STR-MOY-01	Moyens humains et matériels	Ingénieurs structure, projeteurs, logiciels et moyens techniques	Ingénieurs structure, projeteurs, logiciels et moyens techniques	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	10.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	5	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	13
84	3	3	FLU-METH-01	Méthodologie	Méthodologie de dimensionnement et coordination technique	Méthodologie de dimensionnement et coordination technique	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	5	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	34
85	5	5	OPC-TOOL-01	Qualité / BIM / outils	Outils de planning, reporting et tableaux de bord	Outils de planning, reporting et tableaux de bord	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	10.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	SELECT	Faible;Moyen;Bon;Excellent	t	7	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	25
86	3	3	FLU-EXP-01	Expérience spécifique	Expérience générale en études fluides	Expérience générale en études fluides	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	15.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	32
87	1	1	ARCH-MOY-01	Moyens humains et matériels	Composition de l’équipe affectée au projet	Composition de l’équipe affectée au projet	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	10.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	5	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	28
88	3	3	FLU-QUAL-01	Qualité / BIM / outils	Respect des normes, efficacité énergétique et qualité des livrables	Respect des normes, efficacité énergétique et qualité des livrables	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	15.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	6	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	35
89	5	5	OPC-EXP-02	Expérience spécifique	Références sur chantiers complexes multi-intervenants	Références sur chantiers complexes multi-intervenants	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	22
90	5	5	OPC-ADM-01	Données administratives	Présentation du bureau et organisation de l’équipe OPC	Présentation du bureau et organisation de l’équipe OPC	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	10.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	21
91	1	1	ARCH-EXP-01	Expérience spécifique	Expérience générale du bureau dans les études architecturales	Expérience générale du bureau dans les études architecturales	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	15.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	27
1	1	1	ARCH-A-01	Appréciation Du Bureau	Ancienneté du bureau (expérience ≥ 15 ans)	Ancienneté du bureau (expérience ≥ 15 ans)	Renseigner ce champ et joindre les pièces justificatives nécessaires (Profil du bureau, CV du responsable).	Permet d’évaluer le critère « Ancienneté du bureau (expérience ≥ 15 ans) » dans la catégorie « Appréciation Du Bureau ».	Pièces attendues : Profil du bureau, CV du responsable.	Contrôler les pièces fournies et appliquer le barème interne.	8.00	≥ 15 ans avec références continues sur 10 ans : 8 pts\n10-14 ans : 5 pts   |   < 10 ans : 0 pt	MANUEL	NUMBER		t	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308	\N
92	5	5	OPC-MOY-01	Moyens humains et matériels	Moyens humains affectés au suivi, coordination et reporting	Moyens humains affectés au suivi, coordination et reporting	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	10.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	4	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	23
93	5	5	OPC-EXP-01	Expérience spécifique	Expérience générale en ordonnancement, pilotage et coordination	Expérience générale en ordonnancement, pilotage et coordination	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	22
94	4	4	ELEC-METH-01	Méthodologie	Méthodologie de dimensionnement, bilan de puissance et schémas	Méthodologie de dimensionnement, bilan de puissance et schémas	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	5	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	19
95	1	1	ARCH-EXP-02	Expérience spécifique	Références similaires dans le même métier	Références similaires dans le même métier	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	27
96	1	1	ARCH-ADM-01	Données administratives	Présentation du bureau et organisation de l’équipe Architecture	Présentation du bureau et organisation de l’équipe Architecture	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	10.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	26
97	3	3	FLU-ADM-01	Données administratives	Présentation du bureau et organisation de l’équipe Fluides	Présentation du bureau et organisation de l’équipe Fluides	Veuillez renseigner ce champ et joindre les pièces justificatives demandées.	Critère utilisé pour l’appréciation technique du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	10.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308	31
98	2	2	STR-EXP-02	Expérience / Références	Références similaires : fondations, sous-sols, structures complexes	Références similaires : fondations, sous-sols, structures complexes	Veuillez renseigner ce champ et joindre les pièces demandées si nécessaire.	Critère utilisé pour l’évaluation du dossier.	Réponse attendue du candidat.	Évaluation El Emar : Conforme = points maximum ; Non conforme = 0.	25.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	f	2026-07-09 17:58:00.61783	2026-07-10 09:12:59.70308	\N
179	41	62	PDF-D4-OPC-01	Appréciation du bureau	Appréciation du bureau	Appréciation du bureau	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	30.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
180	41	62	PDF-D4-OPC-02	Expérience spécifique	Expérience spécifique OPC	Expérience spécifique OPC	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	54.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
181	41	62	PDF-D4-OPC-03	Outils et maturité numérique	Outils et maturité numérique	Outils et maturité numérique	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	16.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
182	42	63	PDF-D3-BET-01	Appréciation du bureau	Appréciation du bureau	Appréciation du bureau	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	30.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
183	42	63	PDF-D3-BET-02	Expérience spécifique	Expérience spécifique	Expérience spécifique	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	54.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
184	42	63	PDF-D3-BET-03	BIM	Expérience BIM	Expérience BIM	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	16.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
185	43	64	PDF-D2-STR-01	Appréciation du bureau	Appréciation du bureau	Appréciation du bureau	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	30.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
186	43	64	PDF-D2-STR-02	Expérience spécifique	Expérience spécifique	Expérience spécifique	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	54.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
187	43	64	PDF-D2-STR-03	BIM	Expérience BIM	Expérience BIM	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	16.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
188	44	65	PDF-D1-IDEE-01	Qualité architecturale	Qualité architecturale	Qualité architecturale	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	30.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
189	44	65	PDF-D1-IDEE-02	Intégration et contexte	Intégration urbaine, environnementale et contexte	Intégration urbaine, environnementale et contexte	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
190	44	65	PDF-D1-IDEE-03	Fonctionnalité	Organisation fonctionnelle et flexibilité	Organisation fonctionnelle et flexibilité	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
191	44	65	PDF-D1-IDEE-04	Faisabilité technique	Faisabilité technique et rationalité économique	Faisabilité technique et rationalité économique	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	4	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
192	44	65	PDF-D1-IDEE-05	Clarté du dossier	Clarté, lisibilité et complétude du dossier	Clarté, lisibilité et complétude du dossier	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	10.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	5	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
193	45	66	PDF-D1-ARCH-01	Appréciation du bureau	Appréciation du bureau	Appréciation du bureau	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	40.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
194	45	66	PDF-D1-ARCH-02	Expérience spécifique	Expérience spécifique	Expérience spécifique	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	40.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
195	45	66	PDF-D1-ARCH-03	BIM	Expérience BIM	Expérience BIM	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
196	46	67	PDF-A9-JARD-01	Organisation et moyens	Organisation et moyens	Organisation et moyens	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	30.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
197	46	67	PDF-A9-JARD-02	Capacité et expérience	Capacité et expérience	Capacité et expérience	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	50.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
198	46	67	PDF-A9-JARD-03	Qualité et maintenance	Qualité et maintenance	Qualité et maintenance	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
199	47	68	PDF-A8-CUIS-01	Appréciation de l’entreprise	Appréciation de l’entreprise	Appréciation de l’entreprise	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	35.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
200	47	68	PDF-A8-CUIS-02	Capacité et expérience	Capacité et expérience	Capacité et expérience	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	60.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
201	47	68	PDF-A8-CUIS-03	Digitalisation	Maturité numérique	Maturité numérique	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	5.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
202	48	69	PDF-A7-BOIS-01	Appréciation de l’entreprise	Appréciation de l’entreprise	Appréciation de l’entreprise	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	35.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
203	48	69	PDF-A7-BOIS-02	Capacité et expérience	Capacité et expérience	Capacité et expérience	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	60.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
204	48	69	PDF-A7-BOIS-03	Digitalisation	Maturité numérique	Maturité numérique	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	5.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
205	49	70	PDF-A6-ALU-01	Appréciation de l’entreprise	Appréciation de l’entreprise	Appréciation de l’entreprise	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	35.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
206	49	70	PDF-A6-ALU-02	Capacité et expérience	Capacité et expérience globale	Capacité et expérience globale	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	60.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
207	49	70	PDF-A6-ALU-03	Digitalisation	Maturité numérique	Maturité numérique	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	5.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
208	50	71	PDF-A5-ASC-01	Organisation et moyens	Organisation et moyens	Organisation et moyens	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	35.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
209	50	71	PDF-A5-ASC-02	Capacité et expérience	Capacité et expérience	Capacité et expérience	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	60.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
210	50	71	PDF-A5-ASC-03	Méthodes et outils	Méthodes et outils	Méthodes et outils	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	5.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
211	51	72	PDF-A3-ELEC-01	Appréciation de l’entreprise	Appréciation de l’entreprise	Appréciation de l’entreprise	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	35.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
212	51	72	PDF-A3-ELEC-02	Capacité et expérience	Capacité et expérience globale	Capacité et expérience globale	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	60.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
214	52	73	PDF-A2-FLU-01	Appréciation de l’entreprise	Appréciation de l’entreprise	Appréciation de l’entreprise	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	35.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
215	52	73	PDF-A2-FLU-02	Capacité et expérience	Capacité et expérience globale	Capacité et expérience globale	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	60.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
216	52	73	PDF-A2-FLU-03	BIM	Maturité BIM	Maturité BIM	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	5.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
220	54	75	PDF-T7-DIV-01	Évaluation technique et décorative	Fournitures diverses	Fournitures diverses	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	100.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
221	55	76	PDF-T6-ECL-01	Évaluation technique et décorative	Éclairage et lustres	Éclairage et lustres	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	100.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
222	56	77	PDF-T5-PORTES-01	Évaluation technique et décorative	Portes intérieures et blindées	Portes intérieures et blindées	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	100.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
223	57	78	PDF-T4-ELEC-01	Évaluation technique et décorative	Appareils électroménagers	Appareils électroménagers	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	100.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
224	58	79	PDF-T3-SAN-01	Évaluation technique et décorative	Sanitaires et robinetterie	Sanitaires et robinetterie	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	100.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
225	59	80	PDF-T2-SOL-01	Évaluation technique et décorative	Revêtements de sol et marbre	Revêtements de sol et marbre	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	100.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
226	60	81	PDF-T1-TECH-01	Organisation et moyens	Organisation et moyens	Organisation et moyens	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	30.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
227	60	81	PDF-T1-TECH-02	Capacité et performance	Capacité et performance	Capacité et performance	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	50.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	2	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
228	60	81	PDF-T1-TECH-03	Fiabilité	Fiabilité	Fiabilité	Critère issu du PDF officiel des critères d’évaluation.	Critère utilisé pour l’intégration dans la liste agréée.	Réponse et justificatif attendus du candidat.	El Emar vérifie la conformité : conforme = note maximale, non conforme = 0.	20.00	Conforme = points maximum ; Non conforme = 0	BINAIRE	TEXTAREA	\N	t	3	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308	\N
\.


--
-- Data for Name: critere_piece; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.critere_piece (id, critere_evaluation_id, code_piece, nom_piece, raison_piece, note_candidat, note_evaluateur, format_accepte, obligatoire, condition_reponse, ordre_affichage, actif, created_at, updated_at) FROM stdin;
9	6	P-ATTESTATIONS-DE-MO-MODELE	Attestations de MO (modèle El Emar)	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
10	6	P-PLANS-REPRESENTATIFS	plans représentatifs	\N	\N	\N	PDF	t	\N	2	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
12	7	P-ATTESTATIONS-MO	attestations MO	\N	\N	\N	PDF	t	\N	2	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
11	7	P-REFERENCES	Références	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
13	8	P-FICHES-PROJETS	Fiches projets	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
14	8	P-REFERENCES	références	\N	\N	\N	PDF	t	\N	2	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
15	9	P-LISTE-PROJETS-BIM	Liste projets BIM	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
16	10	P-COPIE-DE-LA-LICENCE-BIM	Copie de la licence BIM	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
17	11	P-CV-DETAILLE-DU-SPECIALIST	CV détaillé du spécialiste BIM	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
18	12	P-REFERENCES-PROJETS-BIM-DU	Références projets BIM du spécialiste	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
19	13	P-LISTE-DES-EMPLOYES-BIM	Liste des employés BIM	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
20	14	P-CV-DU-RESPONSABLE-PRINCIP	CV du responsable principal	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
21	15	P-ORGANIGRAMME-COMPLET	Organigramme complet	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
22	16	P-ORGANIGRAMME	Organigramme	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
23	17	P-COPIE-DU-DOSSIER	Copie du dossier	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
24	18	P-CV-INGENIEUR-CHEF-DE-PROJ	CV ingénieur chef de projet	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
25	19	P-ATTESTATIONS-MO-MODELE-EL	Attestations MO (modèle El Emar)	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
26	19	P-PLANS	plans	\N	\N	\N	PDF	t	\N	2	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
28	20	P-ATTESTATIONS-MO	attestations MO	\N	\N	\N	PDF	t	\N	2	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
29	20	P-PLANS-TECHNIQUES	plans techniques	\N	\N	\N	PDF	t	\N	3	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
27	20	P-REFERENCES	Références	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
91	20	P11	Références similaires dans le même métier	Déposer les références ou preuves des projets similaires réalisés.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
30	21	P-FICHES-PROJETS	Fiches projets	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
31	22	P-LISTE-PROJETS-BIM	Liste projets BIM	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
32	23	P-COPIE-LICENCE-BIM	Copie licence BIM	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
33	24	P-CV-SPECIALISTE-BIM	CV spécialiste BIM	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
34	25	P-REFERENCES-BIM-DU-SPECIAL	Références BIM du spécialiste	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
35	26	P-LISTE-EMPLOYES-BIM	Liste employés BIM	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
36	27	P-CV-RESPONSABLE-PRINCIPAL	CV responsable principal	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
37	28	P-ORGANIGRAMME-COMPLET	Organigramme complet	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
38	29	P-ORGANIGRAMME	Organigramme	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
39	30	P-COPIE-DU-DOSSIER	Copie du dossier	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
40	31	P-CV-INGENIEUR-CHEF-DE-PROJ	CV ingénieur chef de projet	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
41	32	P-ATTESTATIONS-MO	Attestations MO	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
42	32	P-PLANS-FLUIDES	plans fluides	\N	\N	\N	PDF	t	\N	2	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
43	33	P-ATTESTATIONS-MO	Attestations MO	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
44	33	P-CCTP	CCTP	\N	\N	\N	PDF	t	\N	2	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
45	33	P-CONTRATS	contrats	\N	\N	\N	PDF	t	\N	3	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
46	34	P-FICHES-PROJETS	Fiches projets	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
47	35	P-LISTE-PROJETS-BIM	Liste projets BIM	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
48	36	P-COPIE-CERTIFICATION	Copie certification	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
49	37	P-CV-SPECIALISTE-BIM	CV spécialiste BIM	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
50	38	P-REFERENCES-BIM-DU-SPECIAL	Références BIM du spécialiste	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
51	39	P-LISTE-EMPLOYES-BIM	Liste employés BIM	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
52	40	P-CV-RESPONSABLE-PRINCIPAL	CV responsable principal	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
53	41	P-ORGANIGRAMME-COMPLET	Organigramme complet	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
54	42	P-ORGANIGRAMME	Organigramme	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
55	43	P-COPIE-DU-DOSSIER	Copie du dossier	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
56	44	P-CV-INGENIEUR-CHEF-DE-PROJ	CV ingénieur chef de projet	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
57	45	P-ATTESTATIONS-MO	Attestations MO	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
58	45	P-PLANS-ELECTRICITE	plans électricité	\N	\N	\N	PDF	t	\N	2	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
59	46	P-ATTESTATIONS-MO	Attestations MO	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
60	46	P-CCTP	CCTP	\N	\N	\N	PDF	t	\N	2	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
61	46	P-CONTRATS	contrats	\N	\N	\N	PDF	t	\N	3	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
63	47	P-ATTESTATIONS	attestations	\N	\N	\N	PDF	t	\N	2	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
62	47	P-FICHES-PROJETS	Fiches projets	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
64	48	P-LISTE-PROJETS-BIM	Liste projets BIM	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
65	49	P-COPIE-CERTIFICATION	Copie certification	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
66	50	P-CV-SPECIALISTE-BIM	CV spécialiste BIM	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
67	51	P-REFERENCES-BIM-DU-SPECIAL	Références BIM du spécialiste	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
68	52	P-LISTE-EMPLOYES-BIM	Liste employés BIM	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
69	53	P-JUSTIFICATIF-ANCIENNETE-E	Justificatif ancienneté et expérience du responsable	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
70	54	P-CV-ET-ORGANIGRAMME-EQUIPE	CV et organigramme équipe OPC	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
71	55	P-CV-CHEF-DE-PROJET-OPC	CV chef de projet OPC	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
72	56	P-LISTE-LOGICIELS-DE-PLANNI	Liste logiciels de planning	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
73	57	P-EXEMPLES-DE-TABLEAUX-DE-B	Exemples de tableaux de bord ou rapports	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
74	58	P-REFERENCES-BIM-OU-COORDIN	Références BIM ou coordination 4D	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
75	59	P-EXEMPLE-GED-OU-PLATEFORME	Exemple GED ou plateforme collaborative	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
6	3	P-CONVENTIONS-DE-PARTENARIA	Conventions de partenariat	\N	\N	\N	PDF	t	\N	2	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
5	3	P-ORGANIGRAMME	Organigramme	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
4	2	P-FICHES-DE-POSTE	fiches de poste	\N	\N	\N	PDF	t	\N	2	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
3	2	P-ORGANIGRAMME-COMPLET	Organigramme complet	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
7	4	P-COPIE-DU-DOSSIER-REMIS	Copie du dossier remis	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
8	5	P-CV-DETAILLE-DE-L-ARCHITEC	CV détaillé de l'architecte chef de projet	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
97	65	P12	Attestation du maître d’ouvrage	Déposer l’attestation ou le justificatif délivré par le maître d’ouvrage.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	2	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
110	66	CV	CV de l’équipe affectée	Déposer les CV ou fiches de l’équipe principale.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
95	68	P11	Références similaires dans le même métier	Déposer les références ou preuves des projets similaires réalisés.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
94	68	P12	Attestation du maître d’ouvrage	Déposer l’attestation ou le justificatif délivré par le maître d’ouvrage.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	2	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
107	69	CV	CV de l’équipe affectée	Déposer les CV ou fiches de l’équipe principale.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
106	70	ORG	Organigramme ou présentation du bureau	Déposer l’organigramme ou une présentation du bureau.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
105	72	METH	Note méthodologique	Déposer la note méthodologique proposée.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
102	73	ORG	Organigramme ou présentation du bureau	Déposer l’organigramme ou une présentation du bureau.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
103	74	METH	Note méthodologique	Déposer la note méthodologique proposée.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
99	75	P11	Références similaires dans le même métier	Déposer les références ou preuves des projets similaires réalisés.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
100	75	P12	Attestation du maître d’ouvrage	Déposer l’attestation ou le justificatif délivré par le maître d’ouvrage.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	2	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
101	76	BIM	Justificatif BIM / outils / qualité	Déposer une preuve de maîtrise BIM, outils ou démarche qualité.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
83	77	METH	Note méthodologique	Déposer la note méthodologique proposée.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
93	78	BIM	Justificatif BIM / outils / qualité	Déposer une preuve de maîtrise BIM, outils ou démarche qualité.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
108	79	BIM	Justificatif BIM / outils / qualité	Déposer une preuve de maîtrise BIM, outils ou démarche qualité.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
127	80	P11	Références similaires dans le même métier	Déposer les références ou preuves des projets similaires réalisés.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:58:00.61783	2026-07-10 09:12:59.70308
109	81	BIM	Justificatif BIM / outils / qualité	Déposer une preuve de maîtrise BIM, outils ou démarche qualité.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
88	82	P12	Attestation du maître d’ouvrage	Déposer l’attestation ou le justificatif délivré par le maître d’ouvrage.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	2	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
86	83	CV	CV de l’équipe affectée	Déposer les CV ou fiches de l’équipe principale.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
104	84	METH	Note méthodologique	Déposer la note méthodologique proposée.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
87	85	TOOL	Justificatif outils de planning / reporting	Déposer un exemple de planning, reporting ou tableau de bord.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
131	86	P11	Références similaires dans le même métier	Déposer les références ou preuves des projets similaires réalisés.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:58:00.61783	2026-07-10 09:12:59.70308
89	87	CV	CV de l’équipe affectée	Déposer les CV ou fiches de l’équipe principale.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
82	89	P11	Références similaires dans le même métier	Déposer les références ou preuves des projets similaires réalisés.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
81	89	P12	Attestation du maître d’ouvrage	Déposer l’attestation ou le justificatif délivré par le maître d’ouvrage.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	2	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
85	90	ORG	Organigramme ou présentation du bureau	Déposer l’organigramme ou une présentation du bureau.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
2	1	P-CV-DU-RESPONSABLE	CV du responsable	\N	\N	\N	PDF	t	\N	2	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
1	1	P-PROFIL-DU-BUREAU	Profil du bureau	\N	\N	\N	PDF	t	\N	1	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
84	92	CV	CV de l’équipe affectée	Déposer les CV ou fiches de l’équipe principale.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
119	93	P11	Références similaires dans le même métier	Déposer les références ou preuves des projets similaires réalisés.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:58:00.61783	2026-07-10 09:12:59.70308
98	94	METH	Note méthodologique	Déposer la note méthodologique proposée.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
92	95	P11	Références similaires dans le même métier	Déposer les références ou preuves des projets similaires réalisés.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
96	96	ORG	Organigramme ou présentation du bureau	Déposer l’organigramme ou une présentation du bureau.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
90	97	ORG	Organigramme ou présentation du bureau	Déposer l’organigramme ou une présentation du bureau.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:26:42.310522	2026-07-10 09:12:59.70308
111	98	P11	Références similaires dans le même métier	Déposer les références ou preuves des projets similaires réalisés.	Pièce demandée au candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	f	2026-07-09 17:58:00.61783	2026-07-10 09:12:59.70308
185	213	JUSTIF-PDF-A3-ELEC-03	Références BIM, licences, CV BIM et justificatifs associés	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
186	179	JUSTIF-PDF-D4-OPC-01	Dossier de présentation, organigramme, CV et références du bureau	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
187	180	JUSTIF-PDF-D4-OPC-02	Références, attestations maître d’ouvrage et fiches projets	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
188	181	JUSTIF-PDF-D4-OPC-03	Pièce justificative du critère	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
189	182	JUSTIF-PDF-D3-BET-01	Dossier de présentation, organigramme, CV et références du bureau	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
190	183	JUSTIF-PDF-D3-BET-02	Références, attestations maître d’ouvrage et fiches projets	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
191	184	JUSTIF-PDF-D3-BET-03	Références BIM, licences, CV BIM et justificatifs associés	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
192	185	JUSTIF-PDF-D2-STR-01	Dossier de présentation, organigramme, CV et références du bureau	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
193	186	JUSTIF-PDF-D2-STR-02	Références, attestations maître d’ouvrage et fiches projets	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
194	187	JUSTIF-PDF-D2-STR-03	Références BIM, licences, CV BIM et justificatifs associés	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
195	188	JUSTIF-PDF-D1-IDEE-01	Certificats qualité, HSE, garanties et documents de maintenance	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
196	189	JUSTIF-PDF-D1-IDEE-02	Pièce justificative du critère	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
197	190	JUSTIF-PDF-D1-IDEE-03	Pièce justificative du critère	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
198	191	JUSTIF-PDF-D1-IDEE-04	Fiches techniques, catalogues, certificats, garanties et références	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
199	192	JUSTIF-PDF-D1-IDEE-05	Pièce justificative du critère	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
200	193	JUSTIF-PDF-D1-ARCH-01	Dossier de présentation, organigramme, CV et références du bureau	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
201	194	JUSTIF-PDF-D1-ARCH-02	Références, attestations maître d’ouvrage et fiches projets	Déposer les pièces justificatives demandées pour ce critère.	Pièce à fournir par le candidat.	Vérifier la conformité, la lisibilité et la cohérence de la pièce.	PDF	t	\N	1	t	2026-07-10 09:12:59.70308	2026-07-10 09:12:59.70308
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
-- Data for Name: grille_evaluation_lot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.grille_evaluation_lot (id, lot_id, code_grille, nom_grille, description, total_points, seuil_admission, actif, created_at, updated_at) FROM stdin;
1	1	GRILLE-ARCH	Grille Architecture	Grille détaillée issue du fichier RFP.xlsx pour le lot Architecture	100.00	80.00	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
2	2	GRILLE-STR	Grille Structure	Grille détaillée issue du fichier RFP.xlsx pour le lot Structure	100.00	80.00	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
3	3	GRILLE-FLU	Grille Fluides	Grille détaillée issue du fichier RFP.xlsx pour le lot Fluides	100.00	80.00	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
4	4	GRILLE-ELEC	Grille Électricité	Grille détaillée issue du fichier RFP.xlsx pour le lot Électricité	100.00	80.00	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
5	5	GRILLE-OPC	Grille OPC	Grille détaillée issue du fichier RFP.xlsx pour le lot OPC (points proposés à ajuster car le fichier ne fournit pas de score OPC détaillé)	100.00	80.00	f	2026-06-25 16:21:28.415743	2026-07-10 09:12:59.70308
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
\.


--
-- Data for Name: historique_action; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.historique_action (id, utilisateur_id, candidature_id, application_candidature_id, action, description, date_action) FROM stdin;
1	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-12 15:46:56.967381
2	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-12 15:48:01.604763
3	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-12 16:15:01.425901
4	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-12 16:27:41.514892
5	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-12 16:33:06.140108
6	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-12 16:33:24.652643
7	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-12 16:33:41.678524
8	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-12 16:34:07.580364
9	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-12 16:39:28.618493
10	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-12 16:39:38.534721
11	9	7	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-12 16:40:05.354781
12	4	10	19	EL_EMAR_DECISION_FINALE_LOT	El Emar a enregistré la décision finale du lot. Candidature: Bureau d’Études Atlas Ingénierie | Lot: Appareils électroménagers | Décision: ADMIS | Observation: -	2026-07-12 18:31:43.896274
13	9	7	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-12 21:21:08.126154
14	9	7	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-12 21:21:15.479128
15	4	\N	\N	EL_EMAR_UPDATE_COMPTE	El Emar a modifié son compte. Ancien nom: Administrateur | Nouveau nom: Administrateur | Ancienne fonction: - | Nouvelle fonction: administrateur	2026-07-12 21:26:45.679315
16	9	7	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-12 21:35:29.866015
17	9	7	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-12 21:55:11.272703
18	9	7	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-12 22:02:33.656647
19	5	\N	\N	TOGGLE_UTILISATEUR	Désactivation du compte utilisateur.	2026-07-12 22:27:31.367107
22	9	7	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-12 22:44:06.402828
23	9	7	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-12 22:44:14.043956
24	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-12 22:44:28.131113
26	10	\N	\N	UPDATE_ROLE_UTILISATEUR	Modification du rôle utilisateur. Nouveau rôle : CND	2026-07-13 09:46:31.471306
27	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-13 10:05:06.512126
28	15	12	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-13 10:18:21.740736
29	15	12	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-13 10:18:54.368695
30	15	12	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-13 10:35:36.423105
31	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-13 10:42:12.220835
32	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-13 10:43:54.946775
33	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-13 10:52:48.166989
34	4	9	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-13 11:08:11.25342
35	4	\N	\N	EL_EMAR_CREATE_UTILISATEUR	Création du compte interne El Emar : mounira@elemar.com | Nom : mounira | Rôle : DA | Nouvel utilisateur ID : 16	2026-07-13 11:09:10.695005
36	4	9	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-13 11:13:53.812441
37	4	\N	\N	EL_EMAR_CREATE_UTILISATEUR	Création du compte interne El Emar : samira@elemar.com | Nom : samira | Rôle : IT | Nouvel utilisateur ID : 17	2026-07-13 11:14:25.418878
38	4	9	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-13 11:17:04.89037
39	4	9	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-13 11:17:05.821175
40	4	\N	\N	EL_EMAR_CREATE_UTILISATEUR	Création du compte interne El Emar : moaz@elemar.com | Nom : moaz | Rôle : IT | Nouvel utilisateur ID : 18	2026-07-13 11:17:31.870471
41	4	9	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-13 11:23:14.518566
42	4	9	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-13 11:23:35.784703
43	4	\N	\N	EL_EMAR_CREATE_UTILISATEUR	Création du compte interne El Emar : lobna@gmail.com | Nom : lobna | Rôle : ADMIN | Nouvel utilisateur ID : 19	2026-07-13 11:25:47.81792
44	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-14 12:46:12.704453
45	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-14 12:46:17.470694
46	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-14 12:49:51.538173
47	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-14 12:50:36.940404
48	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-14 12:52:02.876348
49	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-14 12:53:33.114553
50	10	10	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-14 12:54:08.74365
51	9	7	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-14 12:54:24.308549
52	9	7	\N	MODIFICATION_INFOS_SOCIETE	Le candidat a modifié les informations générales de la société. Ancien: Raison sociale: -, Email: -, Téléphone: - | Nouveau: Raison sociale: -, Email: -, Téléphone: -	2026-07-14 12:54:39.361557
53	9	7	\N	UPLOAD_RNE	Le candidat a déposé ou modifié le fichier RNE. Ancien fichier: - | Nouveau fichier: testt.pdf	2026-07-14 12:54:39.493483
54	9	7	\N	UPLOAD_CNSS	Le candidat a déposé ou modifié le fichier CNSS. Ancien fichier: - | Nouveau fichier: testt.pdf	2026-07-14 12:54:39.514239
55	9	7	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-14 12:54:39.525145
56	9	7	\N	CONSULTATION_CANDIDATURE	Le candidat a ouvert son espace candidature.	2026-07-14 12:54:51.607388
\.


--
-- Data for Name: lot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lot (id, code_lot, nom_lot, description, actif, created_at, type_intervenant_id, updated_at) FROM stdin;
62	D4_OPC	Bureau de pilotage / OPC	Grille d’évaluation des bureaux de pilotage et OPC.	t	2026-07-10 09:12:59.70308	12	2026-07-10 09:12:59.70308
63	D3_BET	Étude fluides et électricité	Grille d’évaluation des études fluides et électricité.	t	2026-07-10 09:12:59.70308	12	2026-07-10 09:12:59.70308
64	D2_STRUCTURE	Étude structurelle	Grille d’évaluation de l’étude structurelle.	t	2026-07-10 09:12:59.70308	12	2026-07-10 09:12:59.70308
65	D1_IDEES	Concours d’idées architecturales	Grille d’évaluation du concours d’idées architecturales.	t	2026-07-10 09:12:59.70308	12	2026-07-10 09:12:59.70308
66	D1_ARCH	Étude architecturale	Grille d’évaluation de l’étude architecturale.	t	2026-07-10 09:12:59.70308	12	2026-07-10 09:12:59.70308
67	A9_JARDINS	Aménagement des jardins	Grille d’évaluation des travaux d’aménagement des jardins.	t	2026-07-10 09:12:59.70308	13	2026-07-10 09:12:59.70308
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
2	STR	Structure	Lot Structure / Génie civil	f	2026-06-12 10:37:44.282701	12	2026-07-10 12:47:37.218395
4	ELEC	Électricité	Lot Électricité CFO / CFA / GTB	f	2026-06-12 10:37:44.282701	12	2026-07-10 12:47:37.218395
5	OPC	OPC	Ordonnancement, Pilotage et Coordination	f	2026-06-12 10:37:44.282701	12	2026-07-10 12:47:37.218395
1	ARCH	Architecture	Lot Architecture	f	2026-06-12 10:37:44.282701	12	2026-07-10 12:47:37.218395
3	FLU	Fluides	Lot Fluides / CVC / Plomberie	f	2026-06-12 10:37:44.282701	12	2026-07-10 12:47:37.218395
\.


--
-- Data for Name: module_navbar; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.module_navbar (id, code_module, groupe, libelle, description, route_front, icone, ordre_groupe, ordre_module, actif, created_at) FROM stdin;
1	SESSIONS_QUALIFICATION	Organisation de la qualification	Sessions de qualification	Planification et suivi des sessions de qualification.	/el-emar/campagnes	ti ti-calendar	1	1	t	2026-06-19 12:39:03.405245
2	DASHBOARD	Supervision	Vue d’ensemble	Tableau de bord global de supervision.	/el-emar/dashboard	ti ti-layout-dashboard	2	1	t	2026-06-19 12:39:03.405245
3	LISTE_AGREEE	Supervision	Liste agréée	Liste officielle des intervenants agréés.	/el-emar/liste-agreee	ti ti-list-check	2	2	t	2026-06-19 12:39:03.405245
4	DOSSIERS_QUALIFICATION	Qualification des intervenants	Dossiers de qualification	Gestion et suivi des dossiers de qualification.	/el-emar/dossiers	ti ti-folder	3	1	t	2026-06-19 12:39:03.405245
5	INTERVENANTS	Qualification des intervenants	Intervenants	Consultation des intervenants/candidats.	/el-emar/candidats	ti ti-users	3	2	t	2026-06-19 12:39:03.405245
6	LOTS	Référentiel de qualification	Domaines d’intervention	Gestion des lots ou domaines d’intervention.	/el-emar/lots	ti ti-category	4	1	t	2026-06-19 12:39:03.405245
7	ZONES	Référentiel de qualification	Zones de classement	Gestion des zones de classement.	/el-emar/zones	ti ti-map	4	2	t	2026-06-19 12:39:03.405245
8	DOCUMENTS_DEMANDES	Référentiel de qualification	Pièces justificatives	Gestion des documents demandés.	/el-emar/documents-demandes	ti ti-file-text	4	3	t	2026-06-19 12:39:03.405245
9	CHAMPS_APPRECIATION	Référentiel de qualification	Informations demandées	Gestion des champs et informations demandées.	/el-emar/champs-appreciation	ti ti-forms	4	4	t	2026-06-19 12:39:03.405245
10	GRILLE_EVALUATION	Référentiel de qualification	Référentiel de notation	Gestion des critères et grilles d’évaluation.	/el-emar/criteres	ti ti-scale	4	5	t	2026-06-19 12:39:03.405245
11	VERIFICATION_DOCUMENTS	Instruction et décision	Contrôle des pièces	Contrôle et validation des documents déposés.	/el-emar/verification-documents	ti ti-file-check	5	1	t	2026-06-19 12:39:03.405245
12	EVALUATIONS	Instruction et décision	Évaluation des dossiers	Évaluation des dossiers de qualification.	/el-emar/evaluations	ti ti-clipboard-list	5	2	t	2026-06-19 12:39:03.405245
13	DECISIONS	Instruction et décision	Décisions de qualification	Décisions finales de qualification.	/el-emar/decisions	ti ti-gavel	5	3	t	2026-06-19 12:39:03.405245
14	CLASSEMENT_ZONE	Instruction et décision	Classement par zone	Classement des intervenants par zone.	/el-emar/classement-zone	ti ti-map-check	5	4	t	2026-06-19 12:39:03.405245
15	UTILISATEURS	Gouvernance et administration	Comptes utilisateurs	Gestion des comptes utilisateurs.	/el-emar/utilisateurs	ti ti-user-cog	6	1	t	2026-06-19 12:39:03.405245
16	ROLES_ACCES	Gouvernance et administration	Rôles et accès	Gestion des rôles et droits d’accès.	/el-emar/roles-acces	ti ti-shield-lock	6	2	t	2026-06-19 12:39:03.405245
17	HISTORIQUE	Gouvernance et administration	Traçabilité	Historique et traçabilité des actions.	/el-emar/historique	ti ti-history	6	3	t	2026-06-19 12:39:03.405245
18	NOTIFICATIONS	Gouvernance et administration	Notifications	Centre de notifications.	/el-emar/notifications	ti ti-bell	6	4	t	2026-06-19 12:39:03.405245
\.


--
-- Data for Name: note_evaluation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.note_evaluation (id, application_candidature_id, critere_evaluation_id, note_obtenue, commentaire_el_emar, date_notation) FROM stdin;
\.


--
-- Data for Name: notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification (id, expediteur_id, destinataire_id, candidature_id, application_candidature_id, message, type_notification, lu, date_creation, reponse_critere_id, critere_evaluation_id, code_critere, libelle_critere, traitee, date_traitement) FROM stdin;
1	4	5	1	14	ddd	COMMENTAIRE_CRITERE_EL_EMAR	t	2026-07-09 15:11:27.193922	3	16	STR-A-03	Bureau multidisciplinaire	f	\N
2	4	10	10	19	GREAT	COMMENTAIRE_CRITERE_EL_EMAR	t	2026-07-11 19:13:26.019087	31	223	PDF-T4-ELEC-01	Appareils électroménagers	f	\N
3	4	10	10	18	TEST	COMMENTAIRE_CRITERE_EL_EMAR	t	2026-07-11 19:14:43.614286	30	221	PDF-T6-ECL-01	Éclairage et lustres	f	\N
\.


--
-- Data for Name: old_champ_appreciation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.old_champ_appreciation (id, section, nom_champ, label_champ, description_champ, type_champ, condition_procedure, code_pxx, options, obligatoire, ordre_affichage, actif, lot_id, modele_reponse, critere_notation_id) FROM stdin;
9	Références	references_de_projets_similaires	Références de projets similaires	Présentez des projets similaires réalisés dans le domaine de la structure.	TEXTAREA	Applicable à tous les candidats du lot Structure.	P6		t	6	t	2	TEXTE_LONG	\N
3	Capacité electrique	capacite_electrique	Capacité electrique	Capacité electrique	BOOLEAN	Applicable à tous les candidats.	P2	Oui;Non	t	2	t	4	OUI_NON	\N
4	Expérience	annees_experience_structure	Nombre d’années d’expérience en structure	Indiquez le nombre d’années d’expérience dans le domaine de la structure.	NUMBER	Applicable à tous les candidats du lot Structure.	P1		t	1	t	2	EXPERIENCE_ANNEES	\N
5	Moyens humains	nombre_personnes_structure	Nombre de personnes disponibles pour la mission	Indiquez le nombre de personnes pouvant être mobilisées pour les études de structure.	NUMBER	Applicable à tous les candidats du lot Structure.	P2		t	2	t	2	NOMBRE_PERSONNES	\N
6	Compétences	competence_beton_arme	Compétence en béton armé	Indiquez si vous avez une expérience confirmée dans les études de béton armé.	BOOLEAN	Applicable à tous les candidats du lot Structure.	P3	Oui;Non	t	3	t	2	OUI_NON	\N
7	Compétences	competence_charpente_metallique	Compétence en charpente métallique	Indiquez si vous avez une expérience confirmée dans les études de charpente métallique.	BOOLEAN	Applicable à tous les candidats du lot Structure.	P4	Oui;Non	t	4	t	2	OUI_NON	\N
8	Outils	logiciels_structure	Logiciels utilisés pour les études de structure	Indiquez les principaux logiciels utilisés pour les calculs et études de structure.	TEXT	Applicable à tous les candidats du lot Structure.	P5		t	5	t	2	TEXTE_COURT	\N
10	Expérience	annees_experience_fluides	Nombre d’années d’expérience en fluides	Indiquez le nombre d’années d’expérience dans les domaines CVC, plomberie ou fluides.	NUMBER	Applicable à tous les candidats du lot Fluides.	P1		t	1	t	3	EXPERIENCE_ANNEES	\N
11	Moyens humains	nombre_personnes_fluides	Nombre de personnes disponibles pour la mission	Indiquez le nombre de personnes pouvant être mobilisées pour les études fluides.	NUMBER	Applicable à tous les candidats du lot Fluides.	P2		t	2	t	3	NOMBRE_PERSONNES	\N
12	Compétences	competence_cvc	Compétence en CVC	Indiquez si vous avez une expérience dans les études de chauffage, ventilation et climatisation.	BOOLEAN	Applicable à tous les candidats du lot Fluides.	P3	Oui;Non	t	3	t	3	OUI_NON	\N
13	Compétences	competence_plomberie	Compétence en plomberie	Indiquez si vous avez une expérience dans les études de plomberie et réseaux sanitaires.	BOOLEAN	Applicable à tous les candidats du lot Fluides.	P4	Oui;Non	t	4	t	3	OUI_NON	\N
14	Performance	approche_efficacite_energetique	Approche en efficacité énergétique	Décrivez votre approche pour intégrer les exigences de performance énergétique.	TEXTAREA	Applicable à tous les candidats du lot Fluides.	P5		t	5	t	3	TEXTE_LONG	\N
15	Références	references_projets_fluides	Références de projets similaires	Présentez des projets similaires réalisés dans le domaine des fluides.	TEXTAREA	Applicable à tous les candidats du lot Fluides.	P6		t	6	t	3	TEXTE_LONG	\N
16	Expérience	annees_experience_electricite	Nombre d’années d’expérience en électricité	Indiquez le nombre d’années d’expérience dans le domaine de l’électricité.	NUMBER	Applicable à tous les candidats du lot Électricité.	P1		t	1	t	4	EXPERIENCE_ANNEES	\N
18	Compétences	competence_cfo	Compétence en CFO	Indiquez si vous avez une expérience dans les études de courant fort.	BOOLEAN	Applicable à tous les candidats du lot Électricité.	P3	Oui;Non	t	3	t	4	OUI_NON	\N
19	Compétences	competence_cfa	Compétence en CFA	Indiquez si vous avez une expérience dans les études de courant faible.	BOOLEAN	Applicable à tous les candidats du lot Électricité.	P4	Oui;Non	t	4	t	4	OUI_NON	\N
20	Compétences	competence_gtb	Compétence en GTB	Indiquez si vous avez une expérience dans les systèmes de gestion technique du bâtiment.	BOOLEAN	Applicable à tous les candidats du lot Électricité.	P5	Oui;Non	f	5	t	4	OUI_NON	\N
21	Outils	logiciels_electricite	Logiciels utilisés pour les études électriques	Indiquez les principaux logiciels utilisés pour les études électriques.	TEXT	Applicable à tous les candidats du lot Électricité.	P6		t	6	t	4	TEXTE_COURT	\N
22	Références	references_projets_electricite	Références de projets similaires	Présentez des projets similaires réalisés dans le domaine de l’électricité.	TEXTAREA	Applicable à tous les candidats du lot Électricité.	P7		t	7	t	4	TEXTE_LONG	\N
23	Expérience	annees_experience_opc	Nombre d’années d’expérience en OPC	Indiquez le nombre d’années d’expérience en ordonnancement, pilotage et coordination.	NUMBER	Applicable à tous les candidats du lot OPC.	P1		t	1	t	5	EXPERIENCE_ANNEES	\N
24	Moyens humains	nombre_personnes_opc	Nombre de personnes disponibles pour la mission	Indiquez le nombre de personnes pouvant être mobilisées pour assurer la mission OPC.	NUMBER	Applicable à tous les candidats du lot OPC.	P2		t	2	t	5	NOMBRE_PERSONNES	\N
25	Méthodologie	methodologie_opc	Méthodologie de planification et de coordination	Décrivez votre méthode de planification, de suivi et de coordination des intervenants.	TEXTAREA	Applicable à tous les candidats du lot OPC.	P3		t	3	t	5	TEXTE_LONG	\N
26	Outils	outils_planification_opc	Outils de planification utilisés	Indiquez les outils utilisés pour la planification et le suivi des travaux.	TEXT	Applicable à tous les candidats du lot OPC.	P4		t	4	t	5	TEXTE_COURT	\N
27	Gestion	gestion_risques_opc	Méthode de gestion des risques et retards	Décrivez votre méthode pour anticiper, suivre et traiter les retards ou blocages.	TEXTAREA	Applicable à tous les candidats du lot OPC.	P5		t	5	t	5	TEXTE_LONG	\N
28	Références	references_projets_opc	Références de missions similaires	Présentez des missions similaires réalisées en OPC.	TEXTAREA	Applicable à tous les candidats du lot OPC.	P6		t	6	t	5	TEXTE_LONG	\N
30	Capacité technique	nombre	Nombre	indiquer	BOOLEAN	Applicable à tous les candidats.	P8	Oui;Non	t	7	t	4	OUI_NON	\N
\.


--
-- Data for Name: old_critere_notation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.old_critere_notation (id, grille_notation_id, lot_id, code_critere, section, libelle_critere, description_critere, label_candidat, aide_candidat, raison_collecte, note_evaluateur, points_max, bareme_notation, type_notation, eliminatoire, generer_champ, type_champ, options_champ, obligatoire, condition_affichage, ordre_affichage, actif, created_at, updated_at) FROM stdin;
1	1	2	STR-P01	Expérience générale	Expérience générale du responsable ou du bureau	Évaluer l’ancienneté et la stabilité du bureau dans les études structure.	Nombre d’années d’expérience en études structure	Indiquez le nombre total d’années d’expérience justifiées.	Cette donnée permet de vérifier si le bureau possède une expérience suffisante pour être qualifié.	À vérifier avec CV, historique du bureau ou références.	8.00	8 points si expérience >= 15 ans, sinon notation selon appréciation évaluateur.	MANUEL	f	t	NUMBER	\N	t	\N	1	t	2026-06-25 11:38:18.839194	2026-06-25 11:38:18.839194
\.


--
-- Data for Name: old_document_demande; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.old_document_demande (id, appel_lot_id, code_document, nom_document, phase, format_accepte, obligatoire, applicable_a, actif, ordre_affichage, lot_id, applicable_tous_lots, critere_piece_id) FROM stdin;
1	\N	P01	Attestation	PH2	PDF	t	Structure,Architecture,Fluides	t	1	\N	f	\N
\.


--
-- Data for Name: old_document_depose; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.old_document_depose (id, application_candidature_id, document_demande_id, nom_fichier, url_fichier, statut_document, commentaire_el_emar, date_upload, date_verification, version) FROM stdin;
\.


--
-- Data for Name: old_donnees_generales_candidature; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.old_donnees_generales_candidature (id, application_candidature_id, effectif_total, nb_ingenieurs_architectes, experience_responsable, bureau_multidisciplinaire, disciplines_complementaires, nb_projets_en_cours, chiffre_affaires_moyen_3ans, candidature_id) FROM stdin;
\.


--
-- Data for Name: old_grille_notation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.old_grille_notation (id, lot_id, appel_candidature_id, code_grille, nom_grille, description, total_points, seuil_admission, actif, created_at, updated_at) FROM stdin;
1	2	\N	STR-QUALIF-2026	Grille de qualification - Étude Structure	Grille de notation utilisée pour qualifier les bureaux d’études structure.	100.00	80.00	t	2026-06-25 11:38:18.839194	2026-06-25 11:38:18.839194
\.


--
-- Data for Name: old_liaison_champ_piece; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.old_liaison_champ_piece (id, champ_appreciation_id, document_demande_id, obligatoire, condition_reponse, message_prestataire, ordre_affichage, actif, critere_piece_id) FROM stdin;
\.


--
-- Data for Name: old_reponse_appreciation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.old_reponse_appreciation (id, application_candidature_id, champ_appreciation_id, valeur_reponse, piece_jointe_oui_non, commentaire_bureau, date_reponse) FROM stdin;
\.


--
-- Data for Name: password_reset_token; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_token (id, utilisateur_id, token, expires_at, used, created_at) FROM stdin;
\.


--
-- Data for Name: piece_candidature_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.piece_candidature_config (id, code_piece, nom_piece, raison_piece, note_candidat, note_evaluateur, format_accepte, obligatoire, ordre_affichage, actif, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: piece_candidature_deposee; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.piece_candidature_deposee (id, candidature_id, piece_candidature_config_id, nom_fichier, chemin_fichier, type_contenu, taille_fichier, statut, commentaire, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: piece_critere_deposee; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.piece_critere_deposee (id, candidature_id, application_candidature_id, critere_piece_id, nom_fichier, chemin_fichier, type_contenu, taille_fichier, statut, commentaire, created_at, updated_at) FROM stdin;
3	1	14	20	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\1\\applications\\14\\pieces-criteres\\piece_20_51c6cca9-a253-49ae-8999-8b597d7e0764_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-06-26 12:28:44.801257	2026-06-26 12:32:50.934498
2	1	14	25	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\1\\applications\\14\\pieces-criteres\\piece_25_1d0f5b25-89d8-43d5-9b59-064ad8456fa5_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-06-26 12:28:44.801257	2026-06-26 12:32:50.938497
18	10	17	234	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\10\\applications\\17\\pieces-criteres\\piece_234_38a19ff3-296f-4b71-93dc-0fe5bf4aa33e_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-07-11 18:26:14.581049	2026-07-11 18:26:31.634915
19	10	17	233	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\10\\applications\\17\\pieces-criteres\\piece_233_0778e70d-6473-49ed-956d-cc8ec19d2259_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-07-11 18:26:14.581049	2026-07-11 18:26:31.63891
9	1	14	23	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\1\\applications\\14\\pieces-criteres\\piece_23_83934c0e-e0ec-4c81-af9c-499ff3445f38_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-06-26 12:32:50.934498	2026-06-26 12:32:50.934498
8	1	14	22	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\1\\applications\\14\\pieces-criteres\\piece_22_1f1c6600-a7fe-462c-9ecb-5190af223453_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-06-26 12:32:50.934498	2026-06-26 12:32:50.934498
1	1	14	21	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\1\\applications\\14\\pieces-criteres\\piece_21_decd7706-1c92-4442-9e91-0406fb546092_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-06-26 12:28:44.801257	2026-06-26 12:32:50.934498
10	1	14	24	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\1\\applications\\14\\pieces-criteres\\piece_24_0a784f77-f109-49bd-bc14-c742125629ad_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-06-26 12:32:50.938497	2026-06-26 12:32:50.938497
6	1	14	27	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\1\\applications\\14\\pieces-criteres\\piece_27_2a061aff-b987-4a19-b95f-4bbb07f106b1_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-06-26 12:28:44.816476	2026-06-26 12:32:50.960658
5	1	14	26	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\1\\applications\\14\\pieces-criteres\\piece_26_8db95193-e606-4079-bca4-79f3fa4cfd6a_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-06-26 12:28:44.816476	2026-06-26 12:32:50.960658
11	1	14	30	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\1\\applications\\14\\pieces-criteres\\piece_30_e919ddd7-e33e-4371-ae7d-cc46c21024f1_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-06-26 12:32:50.967683	2026-06-26 12:32:50.967683
12	1	14	32	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\1\\applications\\14\\pieces-criteres\\piece_32_dabce6ec-1898-48bd-b996-eaee98f75ea5_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-06-26 12:32:50.968682	2026-06-26 12:32:50.968682
4	1	14	28	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\1\\applications\\14\\pieces-criteres\\piece_28_6bcd52c5-35c0-40f1-b0eb-01dab50520ea_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-06-26 12:28:44.812256	2026-06-26 12:32:50.968682
7	1	14	29	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\1\\applications\\14\\pieces-criteres\\piece_29_90656c16-f2e3-4112-86e2-6a44c0f9e831_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-06-26 12:29:36.666665	2026-06-26 12:32:50.970722
13	1	14	31	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\1\\applications\\14\\pieces-criteres\\piece_31_c1576f69-c532-4b71-93ac-4f52ee50368a_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-06-26 12:32:50.986365	2026-06-26 12:32:50.986365
14	1	14	33	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\1\\applications\\14\\pieces-criteres\\piece_33_9bb2ac08-a56a-42b0-a409-0c8d0b4bc59d_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-06-26 12:32:50.986365	2026-06-26 12:32:50.986365
15	1	14	34	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\1\\applications\\14\\pieces-criteres\\piece_34_fd6da4fe-8d23-41c3-9443-2a88340c0061_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-06-26 12:32:50.993376	2026-06-26 12:32:50.993376
16	1	14	35	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\1\\applications\\14\\pieces-criteres\\piece_35_17d8ed1c-d426-47f2-bd8a-7126784db086_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-06-26 12:32:50.994895	2026-06-26 12:32:50.994895
17	2	16	20	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\2\\applications\\16\\pieces-criteres\\piece_20_fbabe99c-35ce-4337-9480-aa714f4dcaf8_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-06-30 10:49:13.295652	2026-06-30 10:49:13.295652
20	10	17	232	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\10\\applications\\17\\pieces-criteres\\piece_232_3a5c4508-e77d-46a3-9902-666e7a22a159_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-07-11 18:26:14.581049	2026-07-11 18:26:31.634915
21	10	18	227	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\10\\applications\\18\\pieces-criteres\\piece_227_5563836d-a536-4702-ab7d-3f0eb04cd3d0_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-07-11 18:26:23.568761	2026-07-12 14:54:52.768072
22	10	19	229	testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\10\\applications\\19\\pieces-criteres\\piece_229_d561e355-a3b0-4068-9a18-7256fff3e2b9_testt.pdf	application/pdf	42252	DEPOSE	\N	2026-07-11 18:26:28.317706	2026-07-11 20:55:12.09443
\.


--
-- Data for Name: projet_reference; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.projet_reference (id, application_candidature_id, nom_projet, lot_concerne, maitre_ouvrage, ville, zone, type_projet, surface_m2, niveaux_r_plus, nombre_sous_sols, annee_livraison, bim_oui_non, seuil_ok, fichier_p11, fichier_p12, montant, mission_realisee, adresse_projet, latitude, longitude, zone_el_emar_id, zone_el_emar_nom, zone_validee) FROM stdin;
1	11	tt	Fluides	ttt	Tunis	Ahmed Tlili	ttttt	500000.00	15	15	2002	\N	\N	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\1\\applications\\11\\references\\p11_reference_1_c7058dd0-ed5f-4bb2-a82b-78f8bb1dc7eb_testt.pdf	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\1\\applications\\11\\references\\p12_reference_1_cd28dc75-8122-4ceb-980f-0cd28f6a0f22_testt.pdf	2000.00	tttt	Ahmed Tlili, Délégation El Omrane Supérieur, Tunis, Gouvernorat Tunis, 1091, Tunisie	36.833443345922575	10.132466812747449	\N	\N	f
2	14	TTT	Structure	TTTT			TTT	5000.00	\N	\N	2022	\N	\N	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\1\\applications\\14\\references\\reference_2_6bcb6e49-aaf2-4ca2-b688-2ffa9f6db118_testt.pdf	\N	\N	\N	\N	\N	\N	29	Zone 2	t
3	19	TEST	Appareils électroménagers	2000	Tunis	Ksar-Said	TEST	2000.00	5	5	2021	t	t	\N	C:\\Users\\OUMAIMA\\Documents\\GitHub\\CapitalEkuity\\backend-el-emar\\uploads\\candidatures\\10\\applications\\19\\references\\p12_reference_3_35319e30-f14a-4e2b-b9cf-6304454549b5_testt.pdf	155.00	TEST	Rue Haffouz, Ksar-Said, Délégation Le Bardo, Tunis, Gouvernorat Tunis, 2017, Tunisie	36.811883571943696	10.12180272936418	\N	\N	f
\.


--
-- Data for Name: reponse_critere; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reponse_critere (id, candidature_id, application_candidature_id, critere_evaluation_id, valeur_text, valeur_number, valeur_boolean, valeur_date, created_at, updated_at) FROM stdin;
1	1	14	14	\N	15.00	\N	\N	2026-06-26 12:17:11.171494	2026-06-26 12:17:11.171494
2	1	14	15	\N	15.00	\N	\N	2026-06-26 12:17:11.244496	2026-06-26 12:17:11.244496
3	1	14	16	\N	\N	t	\N	2026-06-26 12:17:11.252508	2026-06-26 12:17:11.252508
4	1	14	17	\N	\N	t	\N	2026-06-26 12:17:11.259496	2026-06-26 12:17:11.259496
5	1	14	18	\N	15.00	\N	\N	2026-06-26 12:17:11.265496	2026-06-26 12:17:11.265496
6	1	14	19	\N	14.00	\N	\N	2026-06-26 12:17:11.273495	2026-06-26 12:17:11.273495
7	1	14	20	\N	14.00	\N	\N	2026-06-26 12:17:11.284497	2026-06-26 12:17:11.284497
8	1	14	21	Même type	\N	\N	\N	2026-06-26 12:17:11.318499	2026-06-26 12:17:11.318499
9	1	14	22	\N	15.00	\N	\N	2026-06-26 12:17:11.325497	2026-06-26 12:17:11.325497
10	1	14	23	\N	\N	t	\N	2026-06-26 12:17:11.334498	2026-06-26 12:17:11.334498
11	1	14	24	\N	11.00	\N	\N	2026-06-26 12:17:11.354496	2026-06-26 12:17:11.354496
12	1	14	25	\N	14.00	\N	\N	2026-06-26 12:17:11.384497	2026-06-26 12:17:11.384497
13	1	14	26	\N	15.00	\N	\N	2026-06-26 12:17:11.392497	2026-06-26 12:17:11.392497
14	2	16	14	\N	15.00	\N	\N	2026-06-30 10:49:13.181542	2026-06-30 10:49:13.181542
15	2	16	15	\N	\N	\N	\N	2026-06-30 10:49:13.191738	2026-06-30 10:49:13.191738
16	2	16	16	\N	\N	f	\N	2026-06-30 10:49:13.194414	2026-06-30 10:49:13.194414
17	2	16	17	\N	\N	\N	\N	2026-06-30 10:49:13.197707	2026-06-30 10:49:13.197707
18	2	16	18	\N	\N	\N	\N	2026-06-30 10:49:13.200946	2026-06-30 10:49:13.200946
19	2	16	19	\N	\N	\N	\N	2026-06-30 10:49:13.20484	2026-06-30 10:49:13.20484
20	2	16	20	\N	\N	\N	\N	2026-06-30 10:49:13.20755	2026-06-30 10:49:13.20755
21	2	16	21	\N	\N	\N	\N	2026-06-30 10:49:13.210546	2026-06-30 10:49:13.210546
22	2	16	22	\N	\N	\N	\N	2026-06-30 10:49:13.212551	2026-06-30 10:49:13.212551
23	2	16	23	\N	\N	\N	\N	2026-06-30 10:49:13.215546	2026-06-30 10:49:13.215546
24	2	16	24	\N	\N	\N	\N	2026-06-30 10:49:13.219539	2026-06-30 10:49:13.219539
25	2	16	25	\N	\N	\N	\N	2026-06-30 10:49:13.22254	2026-06-30 10:49:13.22254
26	2	16	26	\N	\N	\N	\N	2026-06-30 10:49:13.22554	2026-06-30 10:49:13.22554
27	10	17	226	test	\N	\N	\N	2026-07-11 18:26:14.47108	2026-07-11 18:26:14.47108
28	10	17	227	test	\N	\N	\N	2026-07-11 18:26:14.48201	2026-07-11 18:26:14.48201
29	10	17	228	test	\N	\N	\N	2026-07-11 18:26:14.49202	2026-07-11 18:26:14.49202
30	10	18	221	test	\N	\N	\N	2026-07-11 18:26:23.536776	2026-07-11 18:26:23.536776
31	10	19	223	TEST	\N	\N	\N	2026-07-11 18:26:28.215008	2026-07-11 18:26:28.215008
\.


--
-- Data for Name: role_acces; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_acces (id, code_role, nom_role, description, type_role, role_systeme, actif, created_at) FROM stdin;
1	IT	IT / Administrateur	Accès complet à toute la plateforme	INTERNE	t	t	2026-06-19 12:38:40.894519
2	EL_EMAR	El Emar	Gestion institutionnelle et supervision	INTERNE	t	t	2026-06-19 12:38:40.894519
3	EVALUATEUR	Évaluateur	Instruction et évaluation des dossiers	INTERNE	t	t	2026-06-19 12:38:40.894519
4	DECIDEUR	Décideur	Validation finale et décisions de qualification	INTERNE	t	t	2026-06-19 12:38:40.894519
5	CND	Intervenant	Accès externe pour compléter un dossier de qualification	EXTERNE	t	t	2026-06-19 12:38:40.894519
6	ITT	ITT	ttt	INTERNE	f	t	2026-06-19 13:31:18.661546
\.


--
-- Data for Name: role_module_acces; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_module_acces (id, role_id, module_id, autorise, created_at) FROM stdin;
1	1	1	t	2026-06-19 12:39:27.410187
2	1	2	t	2026-06-19 12:39:27.410187
3	1	3	t	2026-06-19 12:39:27.410187
4	1	4	t	2026-06-19 12:39:27.410187
5	1	5	t	2026-06-19 12:39:27.410187
6	1	6	t	2026-06-19 12:39:27.410187
7	1	7	t	2026-06-19 12:39:27.410187
8	1	8	t	2026-06-19 12:39:27.410187
9	1	9	t	2026-06-19 12:39:27.410187
10	1	10	t	2026-06-19 12:39:27.410187
11	1	11	t	2026-06-19 12:39:27.410187
12	1	12	t	2026-06-19 12:39:27.410187
13	1	13	t	2026-06-19 12:39:27.410187
14	1	14	t	2026-06-19 12:39:27.410187
15	1	15	t	2026-06-19 12:39:27.410187
16	1	16	t	2026-06-19 12:39:27.410187
17	1	17	t	2026-06-19 12:39:27.410187
18	1	18	t	2026-06-19 12:39:27.410187
37	3	1	t	2026-06-19 12:39:53.932807
38	3	2	f	2026-06-19 12:39:53.932807
39	3	3	f	2026-06-19 12:39:53.932807
40	3	4	t	2026-06-19 12:39:53.932807
41	3	5	t	2026-06-19 12:39:53.932807
42	3	6	f	2026-06-19 12:39:53.932807
43	3	7	f	2026-06-19 12:39:53.932807
44	3	8	t	2026-06-19 12:39:53.932807
45	3	9	f	2026-06-19 12:39:53.932807
46	3	10	t	2026-06-19 12:39:53.932807
47	3	11	t	2026-06-19 12:39:53.932807
48	3	12	t	2026-06-19 12:39:53.932807
49	3	13	f	2026-06-19 12:39:53.932807
50	3	14	f	2026-06-19 12:39:53.932807
51	3	15	f	2026-06-19 12:39:53.932807
52	3	16	f	2026-06-19 12:39:53.932807
53	3	17	f	2026-06-19 12:39:53.932807
54	3	18	t	2026-06-19 12:39:53.932807
55	4	1	f	2026-06-19 12:40:06.421071
56	4	2	t	2026-06-19 12:40:06.421071
57	4	3	t	2026-06-19 12:40:06.421071
58	4	4	t	2026-06-19 12:40:06.421071
59	4	5	f	2026-06-19 12:40:06.421071
60	4	6	f	2026-06-19 12:40:06.421071
61	4	7	f	2026-06-19 12:40:06.421071
62	4	8	f	2026-06-19 12:40:06.421071
63	4	9	f	2026-06-19 12:40:06.421071
64	4	10	f	2026-06-19 12:40:06.421071
65	4	11	f	2026-06-19 12:40:06.421071
66	4	12	t	2026-06-19 12:40:06.421071
67	4	13	t	2026-06-19 12:40:06.421071
68	4	14	t	2026-06-19 12:40:06.421071
69	4	15	f	2026-06-19 12:40:06.421071
70	4	16	f	2026-06-19 12:40:06.421071
71	4	17	f	2026-06-19 12:40:06.421071
72	4	18	t	2026-06-19 12:40:06.421071
73	5	1	f	2026-06-19 12:40:20.266217
74	5	2	f	2026-06-19 12:40:20.266217
75	5	3	f	2026-06-19 12:40:20.266217
76	5	4	f	2026-06-19 12:40:20.266217
77	5	5	f	2026-06-19 12:40:20.266217
78	5	6	f	2026-06-19 12:40:20.266217
79	5	7	f	2026-06-19 12:40:20.266217
80	5	8	f	2026-06-19 12:40:20.266217
81	5	9	f	2026-06-19 12:40:20.266217
82	5	10	f	2026-06-19 12:40:20.266217
83	5	11	f	2026-06-19 12:40:20.266217
84	5	12	f	2026-06-19 12:40:20.266217
85	5	13	f	2026-06-19 12:40:20.266217
86	5	14	f	2026-06-19 12:40:20.266217
87	5	15	f	2026-06-19 12:40:20.266217
88	5	16	f	2026-06-19 12:40:20.266217
89	5	17	f	2026-06-19 12:40:20.266217
90	5	18	f	2026-06-19 12:40:20.266217
91	6	1	f	2026-06-19 13:31:18.661546
92	6	2	f	2026-06-19 13:31:18.661546
93	6	3	f	2026-06-19 13:31:18.661546
94	6	4	f	2026-06-19 13:31:18.661546
95	6	5	f	2026-06-19 13:31:18.661546
96	6	6	f	2026-06-19 13:31:18.661546
97	6	7	f	2026-06-19 13:31:18.661546
98	6	8	f	2026-06-19 13:31:18.661546
99	6	9	f	2026-06-19 13:31:18.661546
100	6	10	f	2026-06-19 13:31:18.661546
101	6	11	f	2026-06-19 13:31:18.661546
102	6	12	f	2026-06-19 13:31:18.661546
103	6	13	f	2026-06-19 13:31:18.661546
104	6	14	f	2026-06-19 13:31:18.661546
105	6	15	f	2026-06-19 13:31:18.661546
106	6	16	f	2026-06-19 13:31:18.661546
107	6	17	f	2026-06-19 13:31:18.661546
108	6	18	f	2026-06-19 13:31:18.661546
19	2	1	t	2026-06-19 12:39:37.489943
20	2	2	t	2026-06-19 12:39:37.489943
21	2	3	t	2026-06-19 12:39:37.489943
22	2	4	t	2026-06-19 12:39:37.489943
23	2	5	t	2026-06-19 12:39:37.489943
24	2	6	t	2026-06-19 12:39:37.489943
25	2	7	t	2026-06-19 12:39:37.489943
26	2	8	t	2026-06-19 12:39:37.489943
27	2	9	t	2026-06-19 12:39:37.489943
28	2	10	t	2026-06-19 12:39:37.489943
29	2	11	t	2026-06-19 12:39:37.489943
30	2	12	t	2026-06-19 12:39:37.489943
33	2	15	t	2026-06-19 12:39:37.489943
34	2	16	t	2026-06-19 12:39:37.489943
31	2	13	t	2026-06-19 12:39:37.489943
32	2	14	t	2026-06-19 12:39:37.489943
35	2	17	t	2026-06-19 12:39:37.489943
36	2	18	t	2026-06-19 12:39:37.489943
\.


--
-- Data for Name: type_intervenant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.type_intervenant (id, code, libelle, description, actif, ordre_affichage, created_at, updated_at) FROM stdin;
12	ETUDES	Études	Bureaux d’études et consultants techniques.	t	1	2026-07-10 09:12:59.70308	2026-07-10 11:34:22.558298
13	TRAVAUX	Travaux	Entreprises et prestataires de travaux.	t	2	2026-07-10 09:12:59.70308	2026-07-10 11:34:22.558298
14	FOURNITURES	Fournitures	Fournisseurs techniques et fournisseurs de produits décoratifs.	t	3	2026-07-10 09:12:59.70308	2026-07-10 11:34:22.558298
\.


--
-- Data for Name: utilisateur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.utilisateur (id, nom, email, mot_de_passe, type_utilisateur, statut_compte, premiere_connexion, created_at, updated_at, intervenant_id, fonction, telephone, must_change_password, actif, candidature_id) FROM stdin;
2	Bureau Test	bureau.test@example.com	bureau123	CND	ACTIF	t	2026-06-12 10:37:44.282701	2026-06-12 10:37:44.282701	\N	\N	\N	t	t	\N
1	Responsable El Emar	el.emar@example.com	admin123	IT	ACTIF	f	2026-06-12 10:37:44.282701	2026-06-19 13:18:29.169196	\N	\N	\N	t	t	\N
3	Admin El Emar	admin@elemar.tn	admin123	IT	ACTIF	f	2026-06-15 10:14:07.376716	2026-06-19 13:18:29.169196	\N	\N	\N	t	t	\N
8	brahim	brahim@gmail.com	$2a$10$pmOa/.ojXRkm0zkBus097uLF1gC88fXwFFfMUx2ajN/awpdPVJIAa	CND	ACTIF	t	2026-07-02 11:46:28.074504	2026-07-02 14:42:44.042477	\N	brahim	+21620647222	t	f	6
9	Ahmed	ahmed@gmail.com	$2a$10$aR6O6WbZ6.l0ocQtobHEb.YE0rdbYL4n0rFpkCseKDBk2Um4gDjrO	CND	ACTIF	t	2026-07-02 11:52:31.905973	2026-07-03 09:36:26.232531	\N	test	+21671456789	f	t	7
5	BET Maghreb Architecture	cnd@test.com	cnd123	CND	ACTIF	f	2026-06-22 14:26:32.306225	2026-07-12 22:27:31.344397	\N	\N	\N	t	f	\N
10	oumeyma	oumeyma@garniflex.com	$2a$10$hXED39WR7FETHCx44UgLMO3dGllxhbFQ.PI8wfiu.r7fRVvWyDcMa	CND	ACTIF	t	2026-07-11 16:36:30.202525	2026-07-13 09:46:31.457473	\N	Responsable	+21671456789	t	t	10
15	mourad	mourad@elite.com	$2a$10$ESZ/dJ3G90oFMkii3E8CA.n.WZu8n0sv6MQKJZ0/RXQUmG2RNm0n2	CND	ACTIF	t	2026-07-13 10:17:05.356268	2026-07-13 10:17:46.215143	\N	Responsable technique	+21671456787	t	t	12
4	Administrateur	admin@elemar.com	admin123	IT	ACTIF	f	2026-06-19 10:11:56.156348	2026-07-13 11:08:11.217589	\N	administrateur	\N	t	t	9
16	mounira	mounira@elemar.com	$2a$10$.//6ss/WnyNSr8FBEBkjEOPdXI9iFT8ll0U9hoi2zWsPj8bLoDxYG	DA	ACTIF	t	2026-07-13 11:09:10.598368	2026-07-13 11:09:10.598368	\N	responsable Achat	\N	t	t	\N
18	moaz	moaz@elemar.com	$2a$10$hnwS3qy4yg.L4/1OPYDGzeAv0SC/OH4/4wPwKBdF2l0l/ZW9W0i1W	IT	ACTIF	t	2026-07-13 11:17:31.787176	2026-07-13 11:17:31.787176	\N	responsable IT	\N	t	t	\N
19	lobna	lobna@gmail.com	$2a$10$Ssbn3SuQjyCv6j.e8V6ymu6raZk6Q0emRHRjXTrN/LoJ7d019ovou	ADMIN	ACTIF	t	2026-07-13 11:25:47.724204	2026-07-13 11:25:47.724204	\N	Evaluateur	\N	t	t	\N
17	samira	oumeimatibaoui@gmail.com	$2a$10$qm3T6azu8LrXD5/d8KbAdeLjz/9zVjQncZkR8KfVF7CMkBkMCKJDi	IT	ACTIF	t	2026-07-13 11:14:25.330798	2026-07-13 13:14:47.54534	\N	responsable IT	\N	t	t	\N
\.


--
-- Data for Name: zone; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.zone (id, nom_zone, created_at, utilisateur_id, adresse, latitude, longitude, description, updated_at) FROM stdin;
29	Zone 2	2026-06-19 14:33:46.957615	1	Lac	36.861074	10.183468		2026-07-03 10:32:08.790133
40	Zone 1	2026-07-10 09:12:59.70308	\N	Lac	\N	\N	Zone 1 / Z1 : très haut standing, très complexe, seuil minimum 80/100.	2026-07-10 09:12:59.70308
41	Zone 2	2026-07-10 09:12:59.70308	\N	Ain Zaghouan Nord ; Jardins de Carthage	\N	\N	Zone 2 / Z2 : haut standing, complexe, seuil minimum 80/100.	2026-07-10 09:12:59.70308
42	Zone 3	2026-07-10 09:12:59.70308	\N	Ain Zaghouan ; Soukra	\N	\N	Zone 3 / Z3 : standard, complexité modérée, seuil minimum 80/100.	2026-07-10 09:12:59.70308
44	Zone 1	2026-07-10 11:26:22.518528	1	Bejaoua, Délégation de Sidi Thabet, Gouvernorat Ariana, 2021, Tunisie	36.861315	10.024637	Zone 1 : Lac. Classification très haut standing, complexité très élevée. Seuil minimum 80/100.	2026-07-10 11:26:22.518528
\.


--
-- Name: appel_candidature_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.appel_candidature_id_seq', 5, true);


--
-- Name: appel_lot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.appel_lot_id_seq', 88, true);


--
-- Name: appel_zone_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.appel_zone_id_seq', 55, true);


--
-- Name: application_candidature_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.application_candidature_id_seq', 19, true);


--
-- Name: candidature_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.candidature_id_seq', 12, true);


--
-- Name: candidature_lot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.candidature_lot_id_seq', 14, true);


--
-- Name: categorie_evaluation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categorie_evaluation_id_seq', 124, true);


--
-- Name: champ_appreciation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.champ_appreciation_id_seq', 31, true);


--
-- Name: classement_zone_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.classement_zone_id_seq', 11, true);


--
-- Name: critere_evaluation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.critere_evaluation_id_seq', 228, true);


--
-- Name: critere_notation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.critere_notation_id_seq', 1, true);


--
-- Name: critere_piece_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.critere_piece_id_seq', 234, true);


--
-- Name: document_demande_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.document_demande_id_seq', 2, true);


--
-- Name: document_depose_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.document_depose_id_seq', 1, false);


--
-- Name: donnees_generales_candidature_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.donnees_generales_candidature_id_seq', 1, false);


--
-- Name: grille_evaluation_lot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.grille_evaluation_lot_id_seq', 60, true);


--
-- Name: grille_notation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.grille_notation_id_seq', 1, true);


--
-- Name: historique_action_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.historique_action_id_seq', 56, true);


--
-- Name: liaison_champ_piece_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.liaison_champ_piece_id_seq', 2, true);


--
-- Name: lot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lot_id_seq', 81, true);


--
-- Name: module_navbar_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.module_navbar_id_seq', 18, true);


--
-- Name: note_evaluation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.note_evaluation_id_seq', 1, false);


--
-- Name: notification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notification_id_seq', 3, true);


--
-- Name: password_reset_token_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.password_reset_token_id_seq', 5, true);


--
-- Name: piece_candidature_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.piece_candidature_config_id_seq', 1, false);


--
-- Name: piece_candidature_deposee_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.piece_candidature_deposee_id_seq', 1, false);


--
-- Name: piece_critere_deposee_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.piece_critere_deposee_id_seq', 22, true);


--
-- Name: projet_reference_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.projet_reference_id_seq', 3, true);


--
-- Name: reponse_appreciation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reponse_appreciation_id_seq', 1, false);


--
-- Name: reponse_critere_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reponse_critere_id_seq', 31, true);


--
-- Name: role_acces_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.role_acces_id_seq', 6, true);


--
-- Name: role_module_acces_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.role_module_acces_id_seq', 108, true);


--
-- Name: type_intervenant_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.type_intervenant_id_seq', 14, true);


--
-- Name: utilisateur_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.utilisateur_id_seq', 19, true);


--
-- Name: zone_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.zone_id_seq', 44, true);


--
-- Name: appel_candidature appel_candidature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appel_candidature
    ADD CONSTRAINT appel_candidature_pkey PRIMARY KEY (id);


--
-- Name: appel_lot appel_lot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appel_lot
    ADD CONSTRAINT appel_lot_pkey PRIMARY KEY (id);


--
-- Name: appel_zone appel_zone_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appel_zone
    ADD CONSTRAINT appel_zone_pkey PRIMARY KEY (id);


--
-- Name: application_candidature application_candidature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_candidature
    ADD CONSTRAINT application_candidature_pkey PRIMARY KEY (id);


--
-- Name: candidature_lot candidature_lot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidature_lot
    ADD CONSTRAINT candidature_lot_pkey PRIMARY KEY (id);


--
-- Name: candidature candidature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidature
    ADD CONSTRAINT candidature_pkey PRIMARY KEY (id);


--
-- Name: categorie_evaluation categorie_evaluation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorie_evaluation
    ADD CONSTRAINT categorie_evaluation_pkey PRIMARY KEY (id);


--
-- Name: old_champ_appreciation champ_appreciation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_champ_appreciation
    ADD CONSTRAINT champ_appreciation_pkey PRIMARY KEY (id);


--
-- Name: classement_zone classement_zone_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classement_zone
    ADD CONSTRAINT classement_zone_pkey PRIMARY KEY (id);


--
-- Name: critere_evaluation critere_evaluation_grille_evaluation_lot_id_code_critere_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.critere_evaluation
    ADD CONSTRAINT critere_evaluation_grille_evaluation_lot_id_code_critere_key UNIQUE (grille_evaluation_lot_id, code_critere);


--
-- Name: critere_evaluation critere_evaluation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.critere_evaluation
    ADD CONSTRAINT critere_evaluation_pkey PRIMARY KEY (id);


--
-- Name: old_critere_notation critere_notation_grille_notation_id_code_critere_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_critere_notation
    ADD CONSTRAINT critere_notation_grille_notation_id_code_critere_key UNIQUE (grille_notation_id, code_critere);


--
-- Name: old_critere_notation critere_notation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_critere_notation
    ADD CONSTRAINT critere_notation_pkey PRIMARY KEY (id);


--
-- Name: critere_piece critere_piece_critere_evaluation_id_code_piece_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.critere_piece
    ADD CONSTRAINT critere_piece_critere_evaluation_id_code_piece_key UNIQUE (critere_evaluation_id, code_piece);


--
-- Name: critere_piece critere_piece_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.critere_piece
    ADD CONSTRAINT critere_piece_pkey PRIMARY KEY (id);


--
-- Name: old_document_demande document_demande_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_document_demande
    ADD CONSTRAINT document_demande_pkey PRIMARY KEY (id);


--
-- Name: old_document_depose document_depose_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_document_depose
    ADD CONSTRAINT document_depose_pkey PRIMARY KEY (id);


--
-- Name: old_donnees_generales_candidature donnees_generales_candidature_application_candidature_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_donnees_generales_candidature
    ADD CONSTRAINT donnees_generales_candidature_application_candidature_id_key UNIQUE (application_candidature_id);


--
-- Name: old_donnees_generales_candidature donnees_generales_candidature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_donnees_generales_candidature
    ADD CONSTRAINT donnees_generales_candidature_pkey PRIMARY KEY (id);


--
-- Name: grille_evaluation_lot grille_evaluation_lot_code_grille_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grille_evaluation_lot
    ADD CONSTRAINT grille_evaluation_lot_code_grille_key UNIQUE (code_grille);


--
-- Name: grille_evaluation_lot grille_evaluation_lot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grille_evaluation_lot
    ADD CONSTRAINT grille_evaluation_lot_pkey PRIMARY KEY (id);


--
-- Name: old_grille_notation grille_notation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_grille_notation
    ADD CONSTRAINT grille_notation_pkey PRIMARY KEY (id);


--
-- Name: historique_action historique_action_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historique_action
    ADD CONSTRAINT historique_action_pkey PRIMARY KEY (id);


--
-- Name: old_liaison_champ_piece liaison_champ_piece_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_liaison_champ_piece
    ADD CONSTRAINT liaison_champ_piece_pkey PRIMARY KEY (id);


--
-- Name: lot lot_code_lot_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot
    ADD CONSTRAINT lot_code_lot_key UNIQUE (code_lot);


--
-- Name: lot lot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot
    ADD CONSTRAINT lot_pkey PRIMARY KEY (id);


--
-- Name: module_navbar module_navbar_code_module_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_navbar
    ADD CONSTRAINT module_navbar_code_module_key UNIQUE (code_module);


--
-- Name: module_navbar module_navbar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_navbar
    ADD CONSTRAINT module_navbar_pkey PRIMARY KEY (id);


--
-- Name: note_evaluation note_evaluation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_evaluation
    ADD CONSTRAINT note_evaluation_pkey PRIMARY KEY (id);


--
-- Name: notification notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (id);


--
-- Name: password_reset_token password_reset_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_pkey PRIMARY KEY (id);


--
-- Name: password_reset_token password_reset_token_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_token_key UNIQUE (token);


--
-- Name: piece_candidature_config piece_candidature_config_code_piece_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piece_candidature_config
    ADD CONSTRAINT piece_candidature_config_code_piece_key UNIQUE (code_piece);


--
-- Name: piece_candidature_config piece_candidature_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piece_candidature_config
    ADD CONSTRAINT piece_candidature_config_pkey PRIMARY KEY (id);


--
-- Name: piece_candidature_deposee piece_candidature_deposee_candidature_id_piece_candidature__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piece_candidature_deposee
    ADD CONSTRAINT piece_candidature_deposee_candidature_id_piece_candidature__key UNIQUE (candidature_id, piece_candidature_config_id);


--
-- Name: piece_candidature_deposee piece_candidature_deposee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piece_candidature_deposee
    ADD CONSTRAINT piece_candidature_deposee_pkey PRIMARY KEY (id);


--
-- Name: piece_critere_deposee piece_critere_deposee_application_candidature_id_critere_pi_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piece_critere_deposee
    ADD CONSTRAINT piece_critere_deposee_application_candidature_id_critere_pi_key UNIQUE (application_candidature_id, critere_piece_id);


--
-- Name: piece_critere_deposee piece_critere_deposee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piece_critere_deposee
    ADD CONSTRAINT piece_critere_deposee_pkey PRIMARY KEY (id);


--
-- Name: projet_reference projet_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projet_reference
    ADD CONSTRAINT projet_reference_pkey PRIMARY KEY (id);


--
-- Name: old_reponse_appreciation reponse_appreciation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_reponse_appreciation
    ADD CONSTRAINT reponse_appreciation_pkey PRIMARY KEY (id);


--
-- Name: reponse_critere reponse_critere_application_candidature_id_critere_evaluati_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reponse_critere
    ADD CONSTRAINT reponse_critere_application_candidature_id_critere_evaluati_key UNIQUE (application_candidature_id, critere_evaluation_id);


--
-- Name: reponse_critere reponse_critere_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reponse_critere
    ADD CONSTRAINT reponse_critere_pkey PRIMARY KEY (id);


--
-- Name: role_acces role_acces_code_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_acces
    ADD CONSTRAINT role_acces_code_role_key UNIQUE (code_role);


--
-- Name: role_acces role_acces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_acces
    ADD CONSTRAINT role_acces_pkey PRIMARY KEY (id);


--
-- Name: role_module_acces role_module_acces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_module_acces
    ADD CONSTRAINT role_module_acces_pkey PRIMARY KEY (id);


--
-- Name: type_intervenant type_intervenant_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.type_intervenant
    ADD CONSTRAINT type_intervenant_code_key UNIQUE (code);


--
-- Name: type_intervenant type_intervenant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.type_intervenant
    ADD CONSTRAINT type_intervenant_pkey PRIMARY KEY (id);


--
-- Name: appel_zone uk_appel_zone; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appel_zone
    ADD CONSTRAINT uk_appel_zone UNIQUE (appel_id, zone_id);


--
-- Name: appel_lot uq_appel_lot; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appel_lot
    ADD CONSTRAINT uq_appel_lot UNIQUE (appel_id, lot_id);


--
-- Name: application_candidature uq_application_candidature_direct_lot; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_candidature
    ADD CONSTRAINT uq_application_candidature_direct_lot UNIQUE (candidature_id, lot_id);


--
-- Name: candidature_lot uq_candidature_lot; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidature_lot
    ADD CONSTRAINT uq_candidature_lot UNIQUE (candidature_id, lot_id);


--
-- Name: candidature uq_candidature_user_appel; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidature
    ADD CONSTRAINT uq_candidature_user_appel UNIQUE (utilisateur_id, appel_candidature_id);


--
-- Name: classement_zone uq_classement_zone; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classement_zone
    ADD CONSTRAINT uq_classement_zone UNIQUE (application_candidature_id, zone_id);


--
-- Name: old_document_demande uq_document_demande; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_document_demande
    ADD CONSTRAINT uq_document_demande UNIQUE (appel_lot_id, code_document);


--
-- Name: old_document_depose uq_document_depose_version; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_document_depose
    ADD CONSTRAINT uq_document_depose_version UNIQUE (application_candidature_id, document_demande_id, version);


--
-- Name: old_liaison_champ_piece uq_liaison_champ_document; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_liaison_champ_piece
    ADD CONSTRAINT uq_liaison_champ_document UNIQUE (champ_appreciation_id, document_demande_id);


--
-- Name: note_evaluation uq_note_evaluation; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_evaluation
    ADD CONSTRAINT uq_note_evaluation UNIQUE (application_candidature_id, critere_evaluation_id);


--
-- Name: old_reponse_appreciation uq_reponse_appreciation; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_reponse_appreciation
    ADD CONSTRAINT uq_reponse_appreciation UNIQUE (application_candidature_id, champ_appreciation_id);


--
-- Name: role_module_acces uq_role_module_acces; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_module_acces
    ADD CONSTRAINT uq_role_module_acces UNIQUE (role_id, module_id);


--
-- Name: utilisateur utilisateur_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.utilisateur
    ADD CONSTRAINT utilisateur_email_key UNIQUE (email);


--
-- Name: utilisateur utilisateur_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.utilisateur
    ADD CONSTRAINT utilisateur_pkey PRIMARY KEY (id);


--
-- Name: zone zone_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zone
    ADD CONSTRAINT zone_pkey PRIMARY KEY (id);


--
-- Name: idx_appel_lot_appel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appel_lot_appel ON public.appel_lot USING btree (appel_id);


--
-- Name: idx_appel_lot_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appel_lot_lot ON public.appel_lot USING btree (lot_id);


--
-- Name: idx_appel_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appel_statut ON public.appel_candidature USING btree (statut);


--
-- Name: idx_application_appel_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_application_appel_lot ON public.application_candidature USING btree (appel_lot_id);


--
-- Name: idx_application_candidature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_application_candidature ON public.application_candidature USING btree (candidature_id);


--
-- Name: idx_application_candidature_candidature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_application_candidature_candidature ON public.application_candidature USING btree (candidature_id);


--
-- Name: idx_application_candidature_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_application_candidature_lot ON public.application_candidature USING btree (lot_id);


--
-- Name: idx_application_decision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_application_decision ON public.application_candidature USING btree (decision_finale);


--
-- Name: idx_application_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_application_statut ON public.application_candidature USING btree (statut);


--
-- Name: idx_candidature_appel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidature_appel ON public.candidature USING btree (appel_candidature_id);


--
-- Name: idx_candidature_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidature_statut ON public.candidature USING btree (statut);


--
-- Name: idx_candidature_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidature_user ON public.candidature USING btree (utilisateur_id);


--
-- Name: idx_candidature_utilisateur; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidature_utilisateur ON public.candidature USING btree (utilisateur_id);


--
-- Name: idx_classement_zone_application_candidature_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classement_zone_application_candidature_id ON public.classement_zone USING btree (application_candidature_id);


--
-- Name: idx_classement_zone_zone_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classement_zone_zone_id ON public.classement_zone USING btree (zone_id);


--
-- Name: idx_document_demande_appel_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_demande_appel_lot ON public.old_document_demande USING btree (appel_lot_id);


--
-- Name: idx_document_depose_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_depose_application ON public.old_document_depose USING btree (application_candidature_id);


--
-- Name: idx_document_depose_application_candidature_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_depose_application_candidature_id ON public.old_document_depose USING btree (application_candidature_id);


--
-- Name: idx_document_depose_document_demande_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_depose_document_demande_id ON public.old_document_depose USING btree (document_demande_id);


--
-- Name: idx_document_depose_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_depose_statut ON public.old_document_depose USING btree (statut_document);


--
-- Name: idx_historique_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historique_application ON public.historique_action USING btree (application_candidature_id);


--
-- Name: idx_historique_candidature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historique_candidature ON public.historique_action USING btree (candidature_id);


--
-- Name: idx_liaison_champ_piece_champ; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_liaison_champ_piece_champ ON public.old_liaison_champ_piece USING btree (champ_appreciation_id);


--
-- Name: idx_liaison_champ_piece_document; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_liaison_champ_piece_document ON public.old_liaison_champ_piece USING btree (document_demande_id);


--
-- Name: idx_note_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_application ON public.note_evaluation USING btree (application_candidature_id);


--
-- Name: idx_note_evaluation_application_candidature_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_evaluation_application_candidature_id ON public.note_evaluation USING btree (application_candidature_id);


--
-- Name: idx_note_evaluation_critere_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_evaluation_critere_id ON public.note_evaluation USING btree (critere_evaluation_id);


--
-- Name: idx_notification_destinataire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_destinataire ON public.notification USING btree (destinataire_id);


--
-- Name: idx_notification_lu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_lu ON public.notification USING btree (lu);


--
-- Name: idx_projet_reference_application_candidature_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projet_reference_application_candidature_id ON public.projet_reference USING btree (application_candidature_id);


--
-- Name: idx_reponse_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reponse_application ON public.old_reponse_appreciation USING btree (application_candidature_id);


--
-- Name: idx_reponse_appreciation_application_candidature_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reponse_appreciation_application_candidature_id ON public.old_reponse_appreciation USING btree (application_candidature_id);


--
-- Name: idx_reponse_appreciation_champ_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reponse_appreciation_champ_id ON public.old_reponse_appreciation USING btree (champ_appreciation_id);


--
-- Name: uk_appel_titre_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_appel_titre_lower ON public.appel_candidature USING btree (lower((titre)::text));


--
-- Name: uk_champ_lot_code_pxx_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_champ_lot_code_pxx_lower ON public.old_champ_appreciation USING btree (lot_id, lower((code_pxx)::text));


--
-- Name: uk_champ_lot_nom_champ_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_champ_lot_nom_champ_lower ON public.old_champ_appreciation USING btree (lot_id, lower((nom_champ)::text));


--
-- Name: uk_lot_code_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_lot_code_lower ON public.lot USING btree (lower((code_lot)::text));


--
-- Name: uk_lot_type_code_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_lot_type_code_lower ON public.lot USING btree (type_intervenant_id, lower((code_lot)::text));


--
-- Name: uk_lot_type_nom_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_lot_type_nom_lower ON public.lot USING btree (type_intervenant_id, lower((nom_lot)::text));


--
-- Name: uk_zone_location; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_zone_location ON public.zone USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));


--
-- Name: uq_application_candidature_lot_direct; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_application_candidature_lot_direct ON public.application_candidature USING btree (candidature_id, lot_id);


--
-- Name: uq_candidature_intervenant; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_candidature_intervenant ON public.candidature USING btree (intervenant_id);


--
-- Name: uq_categorie_type_global_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_categorie_type_global_code ON public.categorie_evaluation USING btree (type_intervenant_id, lower((code)::text)) WHERE (lot_id IS NULL);


--
-- Name: uq_categorie_type_lot_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_categorie_type_lot_code ON public.categorie_evaluation USING btree (type_intervenant_id, lot_id, lower((code)::text)) WHERE (lot_id IS NOT NULL);


--
-- Name: uq_champ_appreciation_lot_nom; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_champ_appreciation_lot_nom ON public.old_champ_appreciation USING btree (lot_id, lower((nom_champ)::text));


--
-- Name: uq_document_demande_lot_code_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_document_demande_lot_code_phase ON public.old_document_demande USING btree (lot_id, phase, lower((code_document)::text));


--
-- Name: uq_donnees_generales_candidature_direct; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_donnees_generales_candidature_direct ON public.old_donnees_generales_candidature USING btree (candidature_id);


--
-- Name: appel_candidature trg_appel_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_appel_updated_at BEFORE UPDATE ON public.appel_candidature FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: candidature trg_candidature_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_candidature_updated_at BEFORE UPDATE ON public.candidature FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: utilisateur trg_utilisateur_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_utilisateur_updated_at BEFORE UPDATE ON public.utilisateur FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: appel_candidature appel_candidature_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appel_candidature
    ADD CONSTRAINT appel_candidature_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(id) ON DELETE SET NULL;


--
-- Name: appel_lot appel_lot_appel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appel_lot
    ADD CONSTRAINT appel_lot_appel_id_fkey FOREIGN KEY (appel_id) REFERENCES public.appel_candidature(id) ON DELETE CASCADE;


--
-- Name: appel_lot appel_lot_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appel_lot
    ADD CONSTRAINT appel_lot_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lot(id) ON DELETE RESTRICT;


--
-- Name: application_candidature application_candidature_appel_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_candidature
    ADD CONSTRAINT application_candidature_appel_lot_id_fkey FOREIGN KEY (appel_lot_id) REFERENCES public.appel_lot(id) ON DELETE CASCADE;


--
-- Name: application_candidature application_candidature_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_candidature
    ADD CONSTRAINT application_candidature_candidature_id_fkey FOREIGN KEY (candidature_id) REFERENCES public.candidature(id) ON DELETE CASCADE;


--
-- Name: candidature candidature_appel_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidature
    ADD CONSTRAINT candidature_appel_candidature_id_fkey FOREIGN KEY (appel_candidature_id) REFERENCES public.appel_candidature(id) ON DELETE CASCADE;


--
-- Name: candidature candidature_cree_par_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidature
    ADD CONSTRAINT candidature_cree_par_utilisateur_id_fkey FOREIGN KEY (cree_par_utilisateur_id) REFERENCES public.utilisateur(id) ON DELETE SET NULL;


--
-- Name: candidature candidature_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidature
    ADD CONSTRAINT candidature_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(id) ON DELETE CASCADE;


--
-- Name: classement_zone classement_zone_application_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classement_zone
    ADD CONSTRAINT classement_zone_application_candidature_id_fkey FOREIGN KEY (application_candidature_id) REFERENCES public.application_candidature(id) ON DELETE CASCADE;


--
-- Name: classement_zone classement_zone_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classement_zone
    ADD CONSTRAINT classement_zone_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zone(id) ON DELETE CASCADE;


--
-- Name: critere_evaluation critere_evaluation_grille_evaluation_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.critere_evaluation
    ADD CONSTRAINT critere_evaluation_grille_evaluation_lot_id_fkey FOREIGN KEY (grille_evaluation_lot_id) REFERENCES public.grille_evaluation_lot(id) ON DELETE CASCADE;


--
-- Name: old_critere_notation critere_notation_grille_notation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_critere_notation
    ADD CONSTRAINT critere_notation_grille_notation_id_fkey FOREIGN KEY (grille_notation_id) REFERENCES public.old_grille_notation(id) ON DELETE CASCADE;


--
-- Name: old_document_demande document_demande_appel_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_document_demande
    ADD CONSTRAINT document_demande_appel_lot_id_fkey FOREIGN KEY (appel_lot_id) REFERENCES public.appel_lot(id) ON DELETE CASCADE;


--
-- Name: old_document_depose document_depose_application_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_document_depose
    ADD CONSTRAINT document_depose_application_candidature_id_fkey FOREIGN KEY (application_candidature_id) REFERENCES public.application_candidature(id) ON DELETE CASCADE;


--
-- Name: old_document_depose document_depose_document_demande_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_document_depose
    ADD CONSTRAINT document_depose_document_demande_id_fkey FOREIGN KEY (document_demande_id) REFERENCES public.old_document_demande(id) ON DELETE CASCADE;


--
-- Name: old_donnees_generales_candidature donnees_generales_candidature_application_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_donnees_generales_candidature
    ADD CONSTRAINT donnees_generales_candidature_application_candidature_id_fkey FOREIGN KEY (application_candidature_id) REFERENCES public.application_candidature(id) ON DELETE CASCADE;


--
-- Name: appel_zone fk_appel_zone_appel; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appel_zone
    ADD CONSTRAINT fk_appel_zone_appel FOREIGN KEY (appel_id) REFERENCES public.appel_candidature(id) ON DELETE CASCADE;


--
-- Name: appel_zone fk_appel_zone_zone; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appel_zone
    ADD CONSTRAINT fk_appel_zone_zone FOREIGN KEY (zone_id) REFERENCES public.zone(id) ON DELETE CASCADE;


--
-- Name: application_candidature fk_application_candidature_lot_restrict; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_candidature
    ADD CONSTRAINT fk_application_candidature_lot_restrict FOREIGN KEY (lot_id) REFERENCES public.lot(id) ON DELETE RESTRICT;


--
-- Name: candidature_lot fk_candidature_lot_candidature; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidature_lot
    ADD CONSTRAINT fk_candidature_lot_candidature FOREIGN KEY (candidature_id) REFERENCES public.candidature(id);


--
-- Name: candidature_lot fk_candidature_lot_lot; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidature_lot
    ADD CONSTRAINT fk_candidature_lot_lot FOREIGN KEY (lot_id) REFERENCES public.lot(id);


--
-- Name: candidature fk_candidature_type_intervenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidature
    ADD CONSTRAINT fk_candidature_type_intervenant FOREIGN KEY (type_intervenant_id) REFERENCES public.type_intervenant(id);


--
-- Name: categorie_evaluation fk_categorie_evaluation_lot_cascade; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorie_evaluation
    ADD CONSTRAINT fk_categorie_evaluation_lot_cascade FOREIGN KEY (lot_id) REFERENCES public.lot(id) ON DELETE CASCADE;


--
-- Name: categorie_evaluation fk_categorie_type_intervenant_cascade; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorie_evaluation
    ADD CONSTRAINT fk_categorie_type_intervenant_cascade FOREIGN KEY (type_intervenant_id) REFERENCES public.type_intervenant(id) ON DELETE CASCADE;


--
-- Name: old_champ_appreciation fk_champ_appreciation_lot; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_champ_appreciation
    ADD CONSTRAINT fk_champ_appreciation_lot FOREIGN KEY (lot_id) REFERENCES public.lot(id);


--
-- Name: old_champ_appreciation fk_champ_appreciation_lot_direct; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_champ_appreciation
    ADD CONSTRAINT fk_champ_appreciation_lot_direct FOREIGN KEY (lot_id) REFERENCES public.lot(id);


--
-- Name: critere_evaluation fk_critere_categorie_cascade; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.critere_evaluation
    ADD CONSTRAINT fk_critere_categorie_cascade FOREIGN KEY (categorie_evaluation_id) REFERENCES public.categorie_evaluation(id) ON DELETE CASCADE;


--
-- Name: critere_evaluation fk_critere_evaluation_lot_cascade; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.critere_evaluation
    ADD CONSTRAINT fk_critere_evaluation_lot_cascade FOREIGN KEY (lot_id) REFERENCES public.lot(id) ON DELETE CASCADE;


--
-- Name: critere_piece fk_critere_piece_critere_cascade; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.critere_piece
    ADD CONSTRAINT fk_critere_piece_critere_cascade FOREIGN KEY (critere_evaluation_id) REFERENCES public.critere_evaluation(id) ON DELETE CASCADE;


--
-- Name: old_document_demande fk_document_demande_lot_direct; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_document_demande
    ADD CONSTRAINT fk_document_demande_lot_direct FOREIGN KEY (lot_id) REFERENCES public.lot(id);


--
-- Name: old_donnees_generales_candidature fk_donnees_generales_candidature_direct; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_donnees_generales_candidature
    ADD CONSTRAINT fk_donnees_generales_candidature_direct FOREIGN KEY (candidature_id) REFERENCES public.candidature(id) ON DELETE CASCADE;


--
-- Name: grille_evaluation_lot fk_grille_evaluation_lot_lot_cascade; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grille_evaluation_lot
    ADD CONSTRAINT fk_grille_evaluation_lot_lot_cascade FOREIGN KEY (lot_id) REFERENCES public.lot(id) ON DELETE CASCADE;


--
-- Name: old_liaison_champ_piece fk_liaison_champ; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_liaison_champ_piece
    ADD CONSTRAINT fk_liaison_champ FOREIGN KEY (champ_appreciation_id) REFERENCES public.old_champ_appreciation(id);


--
-- Name: old_liaison_champ_piece fk_liaison_document; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_liaison_champ_piece
    ADD CONSTRAINT fk_liaison_document FOREIGN KEY (document_demande_id) REFERENCES public.old_document_demande(id);


--
-- Name: lot fk_lot_type_intervenant_cascade; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot
    ADD CONSTRAINT fk_lot_type_intervenant_cascade FOREIGN KEY (type_intervenant_id) REFERENCES public.type_intervenant(id) ON DELETE CASCADE;


--
-- Name: piece_critere_deposee fk_piece_deposee_critere_piece_cascade; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piece_critere_deposee
    ADD CONSTRAINT fk_piece_deposee_critere_piece_cascade FOREIGN KEY (critere_piece_id) REFERENCES public.critere_piece(id) ON DELETE CASCADE;


--
-- Name: reponse_critere fk_reponse_critere_critere_cascade; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reponse_critere
    ADD CONSTRAINT fk_reponse_critere_critere_cascade FOREIGN KEY (critere_evaluation_id) REFERENCES public.critere_evaluation(id) ON DELETE CASCADE;


--
-- Name: utilisateur fk_utilisateur_candidature; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.utilisateur
    ADD CONSTRAINT fk_utilisateur_candidature FOREIGN KEY (candidature_id) REFERENCES public.candidature(id);


--
-- Name: zone fk_zone_utilisateur; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zone
    ADD CONSTRAINT fk_zone_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(id) ON DELETE SET NULL;


--
-- Name: historique_action historique_action_application_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historique_action
    ADD CONSTRAINT historique_action_application_candidature_id_fkey FOREIGN KEY (application_candidature_id) REFERENCES public.application_candidature(id) ON DELETE CASCADE;


--
-- Name: historique_action historique_action_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historique_action
    ADD CONSTRAINT historique_action_candidature_id_fkey FOREIGN KEY (candidature_id) REFERENCES public.candidature(id) ON DELETE CASCADE;


--
-- Name: historique_action historique_action_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historique_action
    ADD CONSTRAINT historique_action_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(id) ON DELETE SET NULL;


--
-- Name: note_evaluation note_evaluation_application_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_evaluation
    ADD CONSTRAINT note_evaluation_application_candidature_id_fkey FOREIGN KEY (application_candidature_id) REFERENCES public.application_candidature(id) ON DELETE CASCADE;


--
-- Name: notification notification_application_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_application_candidature_id_fkey FOREIGN KEY (application_candidature_id) REFERENCES public.application_candidature(id) ON DELETE CASCADE;


--
-- Name: notification notification_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_candidature_id_fkey FOREIGN KEY (candidature_id) REFERENCES public.candidature(id) ON DELETE CASCADE;


--
-- Name: notification notification_destinataire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_destinataire_id_fkey FOREIGN KEY (destinataire_id) REFERENCES public.utilisateur(id) ON DELETE CASCADE;


--
-- Name: notification notification_expediteur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_expediteur_id_fkey FOREIGN KEY (expediteur_id) REFERENCES public.utilisateur(id) ON DELETE SET NULL;


--
-- Name: password_reset_token password_reset_token_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(id) ON DELETE CASCADE;


--
-- Name: piece_candidature_deposee piece_candidature_deposee_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piece_candidature_deposee
    ADD CONSTRAINT piece_candidature_deposee_candidature_id_fkey FOREIGN KEY (candidature_id) REFERENCES public.candidature(id) ON DELETE CASCADE;


--
-- Name: piece_candidature_deposee piece_candidature_deposee_piece_candidature_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piece_candidature_deposee
    ADD CONSTRAINT piece_candidature_deposee_piece_candidature_config_id_fkey FOREIGN KEY (piece_candidature_config_id) REFERENCES public.piece_candidature_config(id);


--
-- Name: piece_critere_deposee piece_critere_deposee_application_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piece_critere_deposee
    ADD CONSTRAINT piece_critere_deposee_application_candidature_id_fkey FOREIGN KEY (application_candidature_id) REFERENCES public.application_candidature(id) ON DELETE CASCADE;


--
-- Name: piece_critere_deposee piece_critere_deposee_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piece_critere_deposee
    ADD CONSTRAINT piece_critere_deposee_candidature_id_fkey FOREIGN KEY (candidature_id) REFERENCES public.candidature(id) ON DELETE CASCADE;


--
-- Name: projet_reference projet_reference_application_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projet_reference
    ADD CONSTRAINT projet_reference_application_candidature_id_fkey FOREIGN KEY (application_candidature_id) REFERENCES public.application_candidature(id) ON DELETE CASCADE;


--
-- Name: old_reponse_appreciation reponse_appreciation_application_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_reponse_appreciation
    ADD CONSTRAINT reponse_appreciation_application_candidature_id_fkey FOREIGN KEY (application_candidature_id) REFERENCES public.application_candidature(id) ON DELETE CASCADE;


--
-- Name: old_reponse_appreciation reponse_appreciation_champ_appreciation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.old_reponse_appreciation
    ADD CONSTRAINT reponse_appreciation_champ_appreciation_id_fkey FOREIGN KEY (champ_appreciation_id) REFERENCES public.old_champ_appreciation(id) ON DELETE CASCADE;


--
-- Name: reponse_critere reponse_critere_application_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reponse_critere
    ADD CONSTRAINT reponse_critere_application_candidature_id_fkey FOREIGN KEY (application_candidature_id) REFERENCES public.application_candidature(id) ON DELETE CASCADE;


--
-- Name: reponse_critere reponse_critere_candidature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reponse_critere
    ADD CONSTRAINT reponse_critere_candidature_id_fkey FOREIGN KEY (candidature_id) REFERENCES public.candidature(id) ON DELETE CASCADE;


--
-- Name: role_module_acces role_module_acces_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_module_acces
    ADD CONSTRAINT role_module_acces_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.module_navbar(id) ON DELETE CASCADE;


--
-- Name: role_module_acces role_module_acces_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_module_acces
    ADD CONSTRAINT role_module_acces_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.role_acces(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict mKHGBNDGm09KCTm25Rrs07pMtdU7QbtgkMndZ6MwZc5C1JGe5Qs0QzmvNA1HX7H

