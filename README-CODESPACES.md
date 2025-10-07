# Run in GitHub Codespaces (no local install)

## 1) Open Codespace
- Push this folder to a GitHub repo.
- On the repo page: **Code → Codespaces → Create codespace on main**.

## 2) Start everything
Open the terminal (in your Codespace) and run:
```
docker compose up -d --build
```

This starts:
- Postgres (port 5432)
- MinIO (ports 9000 console at 9001; credentials minioadmin/minioadmin)
- Backend API (port 3000)
- Frontend React dev server (port 5173)

The backend container runs migrations and seeds an admin:
- **admin@example.com / password**

## 3) Open the app
- In Codespaces, open the **Ports** tab.
- Find **5173** → click **Open in Browser**.
- You can also open backend health at port **3000** → `/api/healthz`.

## 4) Test flow
1. Click **Login** with `admin@example.com / password`.
2. Click **Create property** to add a sample record.
3. The list will show new entries.

## 5) File uploads
- MinIO is available at port 9001 (console) with `minioadmin / minioadmin`.
- Uploads from the app go to the `property-files` bucket via S3-compatible API.

## 6) Env variables (optional)
Defaults are set in `docker-compose.yml`. Adjust if needed.

## 7) Stop services
```
docker compose down
```

Enjoy! If you want to deploy this to cloud later, we can wire Render (backend) + Supabase (DB/Storage) + Vercel (frontend).
