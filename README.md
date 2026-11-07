# CV Application Manager

A Next.js app for tracking job applications and emailing your CV to recruiters.

## Features

- **Roles** tab: create, edit and delete roles. Each role has a name, email subject, email body, cover letter and a PDF CV.
  `{position}` in the subject or body is replaced with the role name.
- **Send application**: pick a role and enter one or more email addresses, separated by commas, spaces or new lines.
  Each address gets its own email and is tracked as its own application. The email contains the role's subject,
  its body with the cover letter below it, and the role's latest CV as an attachment.
- Applications list: resend, edit, change status (Draft, Applied, Interview, Offer, Rejected), delete, filter and search.

Data is stored locally:

- `data/db.json`: applications.
- `data/roles.json`: roles.
- `assets/<Role Name>.pdf`: each role's CV. Uploading a new CV overwrites this file. Renaming the role renames the file.
  Deleting the role deletes the file.
- `data/cv/`: CVs uploaded directly on an application.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your SMTP details.
   For Gmail, turn on 2-Step Verification. Then create an App Password at
   https://myaccount.google.com/apppasswords and use it as `SMTP_PASS`.

3. Start the app:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## API

| Method | Route                          | Purpose                                      |
| ------ | ------------------------------ | -------------------------------------------- |
| GET    | `/api/applications`            | List applications                            |
| POST   | `/api/applications`            | JSON `{ roleId, emails }`: create + send      |
| PATCH  | `/api/applications/:id`        | Update fields or status                      |
| DELETE | `/api/applications/:id`        | Delete                                       |
| POST   | `/api/applications/:id/send`   | Send or resend the email                     |
| GET    | `/api/settings`                | Whether SMTP is configured                   |
| GET/POST | `/api/roles`                 | List or create roles (multipart, `cv` = PDF) |
| PUT/DELETE | `/api/roles/:id`             | Update (`removeCv=true` drops CV) or delete  |
| GET    | `/api/roles/:id/cv`            | View the role's current CV                   |

The app has no login. Run it only on your own machine, or add authentication before you deploy it.
