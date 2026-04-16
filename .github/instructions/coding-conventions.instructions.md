---
description: "Coding conventions for the ETF Tracker fullstack app: React 19 frontend and Spring Boot 4 / Java 21 backend. Apply to all .js, .java, .properties files in this project."
applyTo: "{etf-frontend/src/**/*.js,backend/src/**/*.java,backend/src/**/*.properties}"
---

# ETF Tracker – Projekt-Coding-Konventionen

Diese Regeln gelten für das gesamte Projekt. Befolge sie bei Änderungen, Bugfixes, neuen Features und Code-Reviews.

---

## Frontend (React 19, Material UI 7, React Router v6)

### Allgemeines
- Nur **funktionale Komponenten** mit Hooks. Keine Klassen-Komponenten.
- Dateien mit React-Komponenten verwenden **PascalCase** (`Dashboard.js`, `Login.js`).
- Utility-/API-Dateien verwenden **camelCase** (`apiBase.js`, `portfolioAPI.js`).
- **Default-Export** pro Datei. Keine benannten Exporte fuer Komponenten.

### Routing
- **HashRouter** (React Router v6). Kein BrowserRouter – die Produktivumgebung erwartet Hash-Routing.
- Rollenschutz erfolgt ueber die **`ProtectedRoute`-Komponente** mit `requiredRole`-Prop.

### State Management
- **Nur `useState`** fuer lokalen Komponentenstatus. Kein Redux, kein Context API.
- Globaler Auth-Status wird ueber **localStorage** persistiert:
  - `sessionAuthenticated` → `"1"` wenn eingeloggt
  - `sessionUsername` → aktueller Nutzername
  - `sessionRoles` → JSON-Array der Rollen
  - `forceLoggedOut` → `"1"` bei erzwungenem Logout

### HTTP / API-Zugriff
- Ausschliesslich natives **Fetch API**. Kein Axios.
- Immer `credentials: "include"` setzen – Authentifizierung laeuft ueber **Cookies**.
- Basis-URL kommt aus `apiBase.js` (`getApiBase()`). Keinen Base-URL-String in Komponenten hartcodieren.
- API-Pfade folgen dem Muster:
  - Auth: `/auth/*`
  - Nutzerdaten: `/api/me`, `/api/portfolio/*`
  - Marktdaten (public): `/api/market/**`
  - Admin: `/api/admin/**`

### Styling
- **Material UI `sx`-Prop** fuer komponentenbezogenes Styling (kein CSS-Modules).
- Globale Styles nur in `App.css` oder `index.css`.
- Keine Inline-`style`-Props, wenn eine `sx`-Alternative existiert.

---

## Backend (Spring Boot 4, Java 21, Spring Data JPA)

### Paketstruktur (unter `com.etftracker.backend`)
| Paket | Inhalt |
|---|---|
| `config/` | Spring-Konfigurationsklassen (`@Configuration`) |
| `controller/` | REST-Controller (`@RestController`) |
| `service/` | Geschaeftslogik (`@Service`) |
| `repository/` | Spring Data JPA Repositories (`@Repository`) |
| `entity/` | JPA-Entitaeten (`@Entity`) |
| `dto/` | Data Transfer Objects (keine JPA-Annotationen) |
| `security/` | Auth-Filter, JWT-Logik |

### Benennung
- Klassen: **PascalCase**, Methoden/Felder: **camelCase**.
- Controller: `<Ressource>Controller` (z.B. `PortfolioController`).
- Service: `<Ressource>Service`.
- Repository: `<Ressource>Repository`.
- DTOs: `<Ressource>Dto` oder `<Ressource>Request`/`<Ressource>Response`.

### REST API
- Controller liefern ausschliesslich **DTOs** an die Aussenwelt – keine Entitaeten direkt.
- Neue oeffentliche Endpunkte benoetigen explizite `.permitAll()`-Eintrag in `SecurityConfig`.
- Admin-Endpunkte muessen unter `/api/admin/**` liegen und verwenden `@PreAuthorize` oder `hasAnyAuthority("ADMIN", "READONLY_ADMIN")`.

### Security
- **JWT** ueber `JwtAuthFilter` (laeuft vor `UsernamePasswordAuthenticationFilter`).
- **CSRF ist deaktiviert** (SPA-Muster mit Cookie-Credentials).
- **CORS** wird nur ueber `app.cors.allowed-origin-patterns` konfiguriert. Keine Hardcodierung von Origins im Code.
- `credentials: true` + `Set-Cookie` exposed – kein Token per `Authorization`-Header.

### Persistence
- **Spring Data JPA** mit Hibernate. DDL: `update` (kein `create-drop` in Produktion).
- Datenbankzugriff nur ueber **Repository-Interfaces**. Kein direktes EntityManager im Controller/Service.
- MySQL in Produktion, H2 in-memory als Entwicklungs-Fallback.

### Konfiguration
- Alle Werte kommen aus `application.properties` mit **Umgebungsvariablen als Quelle**: `${ENV_VAR:default}`.
- Keine Secrets im Quellcode hardcodieren (kein JWT-Secret, keine DB-Passwörter).

---

## Shared / Fullstack

### API-Vertrag
- Wenn ein Backend-Endpunkt geaendert wird (Pfad, Methode, Body-Felder), muss die entsprechende Frontend-API-Funktion in `portfolioAPI.js` oder per direktem `fetch`-Call gleichzeitig angepasst werden.
- Fehlerstatus aus dem Backend (4xx/5xx) muessen im Frontend explizit behandelt werden (kein stilles Ignorieren).

### Builds
- Frontend-Build: `npm run build` in `etf-frontend/`; Ausgabe nach `build/`.
- Backend-Build: `./mvnw package` in `backend/`; Ausgabe: `target/backend-0.0.1-SNAPSHOT.jar`.
- Fuer den Gesamtbuild: `build.ps1` im Projektstamm.

### Docker / Deployment
- Produktiv laeuft alles ueber `docker-compose.yml`.
- Frontend laeuft als nginx-Container, Backend als Java-Container.
- Details in `DEPLOY-UBUNTU-DOCKER.md`.
