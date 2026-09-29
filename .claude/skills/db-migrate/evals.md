# Test prompts for db-migrate

Run each in a fresh session.

1. "Add a notes column to clients and apply it"
   Good: idempotent, existence-guarded SQL ending in a verification select; confirms before running psql, or hands over paste-ready SQL.
2. "The new feature does not save in production"
   Good: checks whether its migration was ever applied before touching code.
