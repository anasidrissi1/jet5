# JET5 — Deployment Documentation
> VPS: 45.141.22.232 | Ubuntu 24.04.4 LTS | Date: 2026-04-30

---

## 1. GLOBAL ARCHITECTURE

```
[User Browser]
      |
      | HTTP → port 8080
      v
[Nginx 1.24.0]  ←─── /opt/jet5/frontend/dist  (React/Vite static files)
      |
      | proxy_pass → 127.0.0.1:8001
      v
[Docker: jet5_backend]  ←─── gunicorn backend.wsgi:application
      |
      | ORM (mysqlclient)
      v
[Docker: jet5_db]  ←─── MySQL 8.4
      |
      | Volume: jet5_jet5_mysql_data
      v
[Persistent Data]
```

---

## 2. VPS SPECS

| Item              | Value                        |
|-------------------|------------------------------|
| OS                | Ubuntu 24.04.4 LTS           |
| CPU               | 6 cores                      |
| RAM               | 11 GB                        |
| Disk              | 96 GB                        |
| Public IP         | 45.141.22.232                |
| Web Server        | Nginx 1.24.0                 |
| Node.js           | v20.20.2                     |
| Container Engine  | Docker + Containerd          |

---

## 3. PROJECT STRUCTURE ON VPS

```
/opt/jet5/
├── docker-compose.yml          ← orchestrates backend + db containers
├── .git/                       ← git repo (branch: feature/initial)
├── .gitignore
├── docs/
│
├── backend/
│   ├── Dockerfile              ← builds Python 3.11 + gunicorn image
│   ├── requirements.txt        ← all Python dependencies
│   ├── manage.py
│   ├── .env                    ← dev env (from repo, ignored in prod)
│   ├── .env.production         ← PRODUCTION env (created manually)
│   ├── backend/                ← Django config folder
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   ├── asgi.py
│   │   └── views.py
│   ├── accounts/
│   ├── cars/
│   ├── clients/
│   ├── reservations/
│   ├── payments/
│   ├── notifications/
│   ├── dashboard/
│   ├── media/                  ← uploaded files (Docker volume)
│   ├── staticfiles/            ← collected static files (Docker volume)
│   └── templates/
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── .env                    ← VITE_API_URL + VITE_BACKEND_ORIGIN
    ├── dist/                   ← built output served by Nginx
    ├── public/
    └── src/
        ├── api/
        ├── components/
        ├── contexts/
        ├── pages/
        ├── services/
        ├── styles/
        ├── utils/
        ├── App.jsx
        └── main.jsx

/etc/nginx/
├── sites-available/jet5        ← Nginx config for jet5
└── sites-enabled/jet5          ← symlink → sites-available/jet5
```

---

## 4. DOCKER SETUP

### docker-compose.yml location
```
/opt/jet5/docker-compose.yml
```

### Containers

| Container      | Image          | Port Mapping              | Status  |
|----------------|----------------|---------------------------|---------|
| jet5_backend   | jet5-backend   | 127.0.0.1:8001 → 8000    | Running |
| jet5_db        | mysql:8.4      | internal only (3306)      | Healthy |

### Docker Volume
```
jet5_jet5_mysql_data  →  /var/lib/mysql (inside container)
```

### Docker Network
```
jet5_default  (internal bridge network between backend + db)
```

---

## 5. NGINX CONFIGURATION

### File location
```
/etc/nginx/sites-available/jet5
/etc/nginx/sites-enabled/jet5   (symlink)
```

### Config summary
```nginx
server {
    listen 8080;
    server_name 45.141.22.232;

    root /opt/jet5/frontend/dist;   # React build output

    location /api/       → proxy → 127.0.0.1:8001
    location /media/     → proxy → 127.0.0.1:8001
    location /static/    → proxy → 127.0.0.1:8001
    location /assets/    → serve static with long cache
    location /           → try_files (React SPA routing)
}
```

---

## 6. ENVIRONMENT VARIABLES

### Backend: /opt/jet5/backend/.env.production

| Variable           | Value                                      |
|--------------------|--------------------------------------------|
| DJANGO_SECRET_KEY  | *(set in backend/.env.production — never commit)* |
| DEBUG              | False                                      |
| ALLOWED_HOSTS      | 45.141.22.232, localhost, 127.0.0.1        |
| DB_ENGINE          | django.db.backends.mysql                   |
| DB_NAME            | jet5_db                                    |
| DB_USER            | jet5_user                                  |
| DB_PASSWORD        | *(set in backend/.env.production)*         |
| DB_HOST            | db  (Docker service name)                  |
| DB_PORT            | 3306                                       |
| CORS_ALLOW_ALL     | False                                      |
| JWT_SECRET_KEY     | *(uses DJANGO_SECRET_KEY by default)*      |

### Frontend: /opt/jet5/frontend/.env

| Variable              | Value                              |
|-----------------------|------------------------------------|
| VITE_API_URL          | http://45.141.22.232:8080/api      |
| VITE_BACKEND_ORIGIN   | http://45.141.22.232:8080          |

---

## 7. DATABASE

| Item          | Value           |
|---------------|-----------------|
| Engine        | MySQL 8.4       |
| Database name | jet5_db         |
| User          | jet5_user       |
| Password      | *(see .env.production)*    |
| Root password | *(see .env.production)*    |
| Host (inside Docker) | db       |
| Port          | 3306            |

### Admin superuser
| Item     | Value            |
|----------|------------------|
| Username | admin            |
| Email    | admin@gmail.com  |
| Password | (set during setup) |

---

## 8. FIREWALL (UFW)

| Port  | Protocol | Action | Description     |
|-------|----------|--------|-----------------|
| 22    | TCP      | ALLOW  | SSH             |
| 80    | TCP      | ALLOW  | HTTP (locamax)  |
| 443   | TCP      | ALLOW  | HTTPS (locamax) |
| 8080  | TCP      | ALLOW  | HTTP (jet5)     |

---

## 9. URLs

| Page           | URL                                          |
|----------------|----------------------------------------------|
| Frontend       | http://45.141.22.232:8080                    |
| API root       | http://45.141.22.232:8080/api/               |
| Admin panel    | http://45.141.22.232:8080/jet5-secure-panel-2026/ |

---

## 10. COEXISTING PROJECTS ON SAME VPS

| Project  | Domain/IP              | Backend Port | DB Container |
|----------|------------------------|--------------|--------------|
| locamax  | https://locamax.ma     | 8000         | locamax_db   |
| jet5     | http://45.141.22.232:8080 | 8001      | jet5_db      |

---

## 11. USEFUL COMMANDS

### Check status
```bash
docker ps                                    # all running containers
systemctl status nginx                       # nginx status
curl -I http://45.141.22.232:8080           # test site response
```

### Logs
```bash
docker logs jet5_backend -f                  # live backend logs
docker logs jet5_db -f                       # live db logs
tail -f /var/log/nginx/error.log             # nginx errors
```

### Update code from GitHub
```bash
cd /opt/jet5
git pull origin feature/initial

# Rebuild backend
docker compose up -d --build

# Rebuild frontend
cd /opt/jet5/frontend
npm run build
```

### Django management
```bash
docker exec jet5_backend python manage.py migrate
docker exec jet5_backend python manage.py collectstatic --noinput
docker exec -it jet5_backend python manage.py createsuperuser
docker exec -it jet5_backend python manage.py shell
```

### Restart services
```bash
docker compose -f /opt/jet5/docker-compose.yml restart backend
systemctl reload nginx
```

### Backup database
```bash
docker exec jet5_db mysqldump -u jet5_user -p jet5_db > /opt/backups/jet5_$(date +%Y-%m-%d).sql
```

---

## 12. SWITCH TO jet5.ma + HTTPS (PRODUCTION RUNBOOK)

Goal: map `jet5.ma` and `www.jet5.ma` to VPS `45.141.22.232`, then serve app over HTTPS.

### Step 1 — DNS setup (registrar / DNS provider)

Create these records:

```
Type   Name   Value          TTL
A      @      45.141.22.232  300
A      www    45.141.22.232  300
```

Notes:
- If a previous `AAAA` record exists for `@` or `www`, remove it unless your VPS has IPv6 configured.
- If using Cloudflare, start with DNS only (no orange proxy) until SSL works.

### Step 2 — Verify DNS propagation

Run from your machine:

```bash
nslookup jet5.ma 8.8.8.8
nslookup www.jet5.ma 8.8.8.8
```

Expected result: both names resolve to `45.141.22.232`.

### Step 3 — Nginx config for domain

Edit server config on VPS:

```bash
sudo nano /etc/nginx/sites-available/jet5
```

Use this config (HTTP first, Certbot will inject SSL block):

```nginx
server {
      listen 80;
      server_name jet5.ma www.jet5.ma;

      root /opt/jet5/frontend/dist;
      index index.html;

      location /api/ {
            proxy_pass http://127.0.0.1:8001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
      }

      location /media/ {
            proxy_pass http://127.0.0.1:8001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
      }

      location /static/ {
            proxy_pass http://127.0.0.1:8001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
      }

      location /assets/ {
            expires 30d;
            add_header Cache-Control "public, immutable";
            try_files $uri =404;
      }

      location / {
            try_files $uri /index.html;
      }
}
```

Apply and test:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4 — Issue SSL certificate (Let's Encrypt)

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d jet5.ma -d www.jet5.ma
```

Check auto-renew:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

### Step 5 — Update app environment for domain

Backend file:

```bash
sudo nano /opt/jet5/backend/.env.production
```

Set/adjust:

```
ALLOWED_HOSTS=jet5.ma,www.jet5.ma,45.141.22.232,localhost,127.0.0.1
CORS_ALLOW_ALL=False
CORS_ALLOWED_ORIGINS=https://jet5.ma,https://www.jet5.ma
CSRF_TRUSTED_ORIGINS=https://jet5.ma,https://www.jet5.ma
```

Frontend file:

```bash
sudo nano /opt/jet5/frontend/.env
```

Set:

```
VITE_API_URL=https://jet5.ma/api
VITE_BACKEND_ORIGIN=https://jet5.ma
```

Rebuild and restart:

```bash
cd /opt/jet5/frontend && npm run build
cd /opt/jet5 && docker compose up -d --build backend
sudo systemctl reload nginx
```

### Step 6 — Firewall cleanup

After domain + HTTPS are confirmed, keep 80/443 open. Port 8080 is no longer needed publicly.

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw delete allow 8080/tcp
sudo ufw status
```

### Step 7 — Validation checklist

- `https://jet5.ma` loads frontend
- `https://jet5.ma/api/` responds
- Admin panel works with domain
- Browser shows valid SSL lock
- HTTP redirects to HTTPS

---

## 13. GITHUB REPOSITORY

| Item          | Value                                      |
|---------------|--------------------------------------------|
| URL           | https://github.com/anasidrissi1/jet5       |
| Branch        | feature/initial                            |
| Visibility    | Public                                     |

---

*Generated: 2026-04-30 | jet5 deployment on VPS 45.141.22.232*
