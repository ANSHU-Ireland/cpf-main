BEGIN;

-- Campaign dashboards read aggregate review scores through the least-privilege app role.
GRANT SELECT ON TABLE review.aggregate_scores TO cpf_app;

COMMIT;
