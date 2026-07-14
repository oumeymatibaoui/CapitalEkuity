ALTER TABLE notification
ADD COLUMN IF NOT EXISTS reponse_critere_id BIGINT;

ALTER TABLE notification
ADD COLUMN IF NOT EXISTS critere_evaluation_id BIGINT;

ALTER TABLE notification
ADD COLUMN IF NOT EXISTS code_critere VARCHAR(255);

ALTER TABLE notification
ADD COLUMN IF NOT EXISTS libelle_critere VARCHAR(500);