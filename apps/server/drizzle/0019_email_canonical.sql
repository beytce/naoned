ALTER TABLE "accounts" ADD COLUMN "email_canonical" text;--> statement-breakpoint
-- The mailbox of each account (as canonicalEmail in src/auth/canonical.ts). When accounts of
-- before share one, the oldest takes it; the others keep none, open with their own address, and
-- are listed in /admin for the owner to decide.
UPDATE "accounts" AS a SET "email_canonical" = c.canonical
FROM (
  SELECT id, canonical,
    row_number() OVER (PARTITION BY canonical ORDER BY created_at, id) AS n
  FROM (
    SELECT id, created_at,
      CASE WHEN split_part(lower(email), '@', 2) IN ('gmail.com', 'googlemail.com')
        THEN replace(split_part(split_part(lower(email), '@', 1), '+', 1), '.', '') || '@gmail.com'
        ELSE split_part(split_part(lower(email), '@', 1), '+', 1) || '@' || split_part(lower(email), '@', 2)
      END AS canonical
    FROM "accounts"
  ) AS x
) AS c
WHERE a.id = c.id AND c.n = 1;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_email_canonical_key" ON "accounts" USING btree ("email_canonical");
