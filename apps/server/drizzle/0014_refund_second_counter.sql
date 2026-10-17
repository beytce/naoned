-- The second counter is gone (October 2026): each house that bought it gets its Influence back,
-- in a `refund` line of the same patent, once (the key is unique per account).
INSERT INTO "influence_entries" ("account_id", "world_id", "source", "week", "amount", "patent", "key", "at")
SELECT "account_id", NULL, 'refund', NULL, -"amount", "patent", 'refund:' || "patent", now()
FROM "influence_entries"
WHERE "source" = 'patent' AND "patent" = 'second_counter'
ON CONFLICT DO NOTHING;
