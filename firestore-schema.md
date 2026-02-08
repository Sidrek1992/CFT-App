# Data Model (Supabase)

This project now stores user data in Supabase. Main tables:

- `users`
- `databases`
- `officials`
- `templates`
- `current_template`
- `sent_history` (PK compuesta: `user_id`, `official_id`)
- `user_settings`

Suggested indexes:

- `databases.user_id`
- `officials.database_id`
- `templates.user_id`
- `sent_history.user_id`

Reference SQL: `supabase-schema.sql`.
