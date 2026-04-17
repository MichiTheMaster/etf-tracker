# Git Push Shortcut

Der folgende Befehl pusht deine lokale Branch `appmod/java-upgrade-20260417-0001` zum Remote `origin` und setzt das Upstream-Tracking:

```bash
git push -u origin appmod/java-upgrade-20260417-0001
```

Kurz erklärt:
- `-u` (oder `--set-upstream`) verbindet die lokale Branch mit `origin/appmod/java-upgrade-20260417-0001`, sodass du künftig nur `git push` und `git pull` verwenden kannst.
- Du wirst ggf. zur Authentifizierung aufgefordert (SSH-Key oder HTTPS-Credentials).

Wenn du möchtest, kann ich die Datei anpassen (z. B. weitere nützliche Git-Befehle hinzufügen) oder eine PR vorbereiten.

## Deploy auf dem Ubuntu-Rechner

Auf dem Ubuntu-Rechner kannst du nach dem Push zusätzlich das Deploy‑Script `deployapp` ausführen. `deployapp` kann in beliebigen Verzeichnissen gestartet werden.

Beispiel (remote auf dem Ubuntu-Host):

```bash
# auf dem Ubuntu-Host ausführen (in jedem Verzeichnis möglich):
deployapp
```

Wenn du möchtest, füge ich noch eine kurze Anleitung hinzu, wie du per SSH auf den Host gelangst und `deployapp` remote ausführst.

### SSH - Remoteausführung

Einfaches Beispiel (führt `deployapp` einmal remote aus):

```bash
ssh user@hostname 'deployapp'
```

Wenn der SSH‑Port abweicht, füge `-p <port>` hinzu, z. B. `ssh -p 2222 user@hostname 'deployapp'`.

Als Hintergrundjob mit Log-Ausgabe:

```bash
ssh user@hostname "nohup deployapp > deploy.log 2>&1 &"
```

Hinweis: Mit SSH‑Schlüssel (key auth) läuft das ohne Passwortabfrage; ansonsten erfolgt eine Passwortaufforderung.