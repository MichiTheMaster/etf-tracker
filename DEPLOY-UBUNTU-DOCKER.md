# ETF Tracker auf Ubuntu mit Docker betreiben

## 1) Voraussetzungen auf Ubuntu 24.04

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

Danach einmal neu anmelden (oder reboot), damit die `docker`-Gruppe aktiv ist.

## 2) Projekt holen und konfigurieren

```bash
git clone <DEIN-REPO-URL> etf-tracker
cd etf-tracker
cp .env.example .env
```

Dann in `.env` die Secrets/Werte setzen:
- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`
- `JWT_SECRET`

## 3) Container starten

```bash
docker compose up -d --build
```

Status prüfen:

```bash
docker compose ps
docker compose logs -f backend
```

## 4) Vom Windows-Rechner zugreifen

Ubuntu-IP ermitteln:

```bash
ip a
```

Dann auf Windows im Browser aufrufen:

```text
http://<ubuntu-ip>
```

## 5) Ubuntu Firewall (falls aktiv)

```bash
sudo ufw allow 80/tcp
sudo ufw deny 8081/tcp
sudo ufw enable
sudo ufw status
```

Hinweis: Port 8081 bleibt intern. Zugriff erfolgt nur ueber Nginx auf Port 80.

## 6) Updates ausrollen

```bash
git pull
docker compose up -d --build
docker image prune -f
```

## 7) Optional: HTTPS fuer externen Zugriff

Wenn du aus dem Internet erreichbar sein willst, nutze Domain + TLS (Let's Encrypt), und setze in `.env`:

```text
APP_COOKIE_SECURE=true
```

Ohne HTTPS sollte `APP_COOKIE_SECURE=false` bleiben.
