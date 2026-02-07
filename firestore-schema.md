# Firestore Collections

This project stores user data in Firebase Firestore with these collections:

- `users` (doc id: `google_id`)
- `databases` (doc id: database id)
- `officials` (doc id: official id)
- `templates` (doc id: template id)
- `current_template` (doc id: user id)
- `sent_history` (doc id: `${userId}__${officialId}`)
- `user_settings` (doc id: user id)

Suggested indexes:

- `databases.user_id`
- `officials.database_id`
- `templates.user_id`
- `sent_history.user_id`
