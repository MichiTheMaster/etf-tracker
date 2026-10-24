export const LEGAL_CONTENT = {
  impressum: {
    title: "Impressum",
    updatedAt: "21.10.2026",
    sections: [
      {
        heading: "Angaben gemäß § 5 DDG",
        paragraphs: [
          "Betreiber dieser App ist die jeweils veröffentlichende natürliche oder juristische Person."
        ],
        bullets: [
          "Name: Michael Schurat",
          "Anschrift: Baumgartenstr. 5, 35099 Burgwald, Deutschland",
          "E-Mail: michael@schurat.org",
        ]
      },
      {
        heading: "Inhaltlich verantwortlich",
        paragraphs: [
          "Verantwortlich für journalistisch-redaktionelle Inhalte im Sinne des Medienrechts ist die im Impressum benannte Person oder Gesellschaft."
        ]
      },
      {
        heading: "Haftung für Inhalte und Links",
        paragraphs: [
          "Diese App wurde mit größtmöglicher Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte wird jedoch keine Gewähr übernommen.",
          "Diese App kann Links oder Datenquellen Dritter enthalten. Für Inhalte externer Angebote sind ausschließlich deren Betreiber verantwortlich."
        ]
      },
      {
        heading: "Urheberrecht",
        paragraphs: [
          "Die in dieser App enthaltenen Inhalte, Designs, Texte und technischen Umsetzungen unterliegen dem jeweils anwendbaren Urheberrecht.",
          "Eine Vervielfältigung, Bearbeitung oder Verbreitung außerhalb der gesetzlichen Grenzen bedarf der vorherigen Zustimmung des Rechteinhabers."
        ]
      }
    ]
  },
  datenschutz: {
    title: "Datenschutzerklärung",
    updatedAt: "21.10.2026",
    sections: [
      {
        heading: "Verantwortliche Stelle",
        paragraphs: [
          "Verantwortliche Stelle für die Datenverarbeitung ist der im Impressum genannte Betreiber. Kontakt ist die dort angegebene E-Mail-Adresse."
        ]
      },
      {
        heading: "Welche Daten verarbeitet werden",
        bullets: [
          "Registrierung: Benutzername, E-Mail-Adresse, Passwort (nur als Hash)",
          "Anmeldung: Sitzungen, Cookie-Kennungen, Zeitpunkt, IP-Adresse und User-Agent",
          "Sicherheit: fehlgeschlagene Logins, temporäre Kontosperren, Audit-Log",
          "Optional: Token für E-Mail-Bestätigung und Passwort-Reset, wenn diese Funktionen aktiv sind",
          "Fachdaten: Portfolios, Transaktionen, Simulationen und selbst angelegte ETF-Einträge",
          "Technische Logs und Fehlermeldungen des Betriebs"
        ]
      },
      {
        heading: "Zwecke und Rechtsgrundlagen",
        paragraphs: [
          "Die Verarbeitung dient dem Betrieb der App, der Anmeldung, der Speicherung deiner Portfolios sowie der Absicherung gegen Missbrauch."
        ],
        bullets: [
          "Art. 6 Abs. 1 lit. b DSGVO: Vertrag bzw. vorvertragliche Nutzung (Konto, Portfolio, Login)",
          "Art. 6 Abs. 1 lit. f DSGVO: berechtigtes Interesse an IT-Sicherheit und Missbrauchsprävention",
          "Art. 6 Abs. 1 lit. c DSGVO: soweit gesetzliche Pflichten bestehen"
        ]
      },
      {
        heading: "Hosting und Empfänger",
        paragraphs: [
          "Personenbezogene Daten liegen auf der vom Betreiber betriebenen Instanz (Anwendung und Datenbank). Es gibt derzeit keine Analyse-, Werbe- oder Tracking-Dienstleister.",
          "Kurse werden serverseitig aus dem offiziellen 15-Minuten-Delayed-Feed der Deutschen Börse (Xetra und Frankfurt) bezogen, typischerweise über Wertpapierkennungen (ISIN), nicht über dein Benutzerkonto. Dabei kann die IP-Adresse des Servers bei der Deutschen Börse sichtbar sein. TER-Kennzahlen stammen nur aus einer selbst gepflegten Fallback-Liste auf der Instanz, nicht von justETF, Yahoo, Stooq oder ETFdb."
        ]
      },
      {
        heading: "Speicherdauer",
        paragraphs: [
          "Login-Cookies gelten in der Regel 24 Stunden. Sitzungs- und Sicherheitsdaten bleiben, solange sie für Login-Schutz und Nachvollziehbarkeit nötig sind.",
          "Konto-, Portfolio- und Transaktionsdaten bleiben gespeichert, bis das Konto gelöscht wird. Eine Selbstlöschung in der App gibt es derzeit nicht; eine Löschung kannst du per E-Mail an die Adresse im Impressum verlangen."
        ]
      },
      {
        heading: "Cookies und lokale Speicherung",
        paragraphs: [
          "Für den Login setzt die App die technisch erforderlichen Cookies jwt und sid (HttpOnly, SameSite=Lax, Laufzeit in der Regel 24 Stunden). Details stehen in den Cookie-Hinweisen.",
          "Im Browser speichert die App außerdem lokale technische Werte, etwa den angemeldeten Status und Simulationsdaten. Es gibt kein Tracking und kein Consent-Banner, weil keine optionalen Analyse- oder Marketing-Cookies eingesetzt werden."
        ]
      },
      {
        heading: "Rechte betroffener Personen",
        paragraphs: [
          "Du hast nach der DSGVO insbesondere Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Anfragen an die E-Mail im Impressum.",
          "Du kannst dich bei einer Datenschutzaufsichtsbehörde beschweren. Zuständig am Sitz des Betreibers ist der Hessische Beauftragte für Datenschutz und Informationsfreiheit."
        ]
      },
      {
        heading: "Datensicherheit",
        paragraphs: [
          "Passwörter werden gehasht gespeichert. Login erfolgt über HttpOnly-Cookies. Es werden technische und organisatorische Maßnahmen zum Schutz vor Verlust und unberechtigtem Zugriff getroffen. Ein unterbrechungsfreier Schutz kann nicht zugesichert werden."
        ]
      }
    ]
  },
  cookies: {
    title: "Cookie- und Consent-Hinweise",
    updatedAt: "21.10.2026",
    sections: [
      {
        heading: "Nur technisch erforderliche Cookies",
        paragraphs: [
          "Die App setzt derzeit ausschließlich Cookies, die für Anmeldung und geschützte Bereiche nötig sind. Es gibt keine Analyse-, Werbe- oder Social-Media-Cookies und deshalb kein Consent-Banner."
        ]
      },
      {
        heading: "Gesetzte Cookies",
        bullets: [
          "jwt: Anmelde-Token, HttpOnly, SameSite=Lax, Pfad /, Laufzeit in der Regel 24 Stunden",
          "sid: Sitzungskennung, HttpOnly, SameSite=Lax, Pfad /, Laufzeit in der Regel 24 Stunden"
        ]
      },
      {
        heading: "Lokale Speicherung im Browser",
        paragraphs: [
          "Unabhängig von Cookies speichert die App im localStorage technische Werte, damit die Oberfläche den Login-Status kennt und Simulationen erhalten bleiben. Dazu gehören unter anderem Anmeldestatus, Benutzername, Rollen, ein Abmelde-Merkmal sowie Simulator- und ETF-Auswahl pro Benutzer. Diese Werte bleiben auf deinem Gerät, bis du sie löschst oder der Browser sie entfernt."
        ]
      },
      {
        heading: "Kein Tracking",
        paragraphs: [
          "Google Analytics, Marketing-Pixel, Heatmaps oder eingebettete Inhalte mit Tracking sind nicht eingebunden. Würden später optionale Tools hinzukommen, wäre dafür vorher eine Einwilligung nötig."
        ]
      }
    ]
  },
  nutzungsbedingungen: {
    title: "Nutzungsbedingungen",
    updatedAt: "24.10.2026",
    sections: [
      {
        heading: "Vertragspartner",
        paragraphs: [
          "Vertragspartner für die Nutzung dieser App ist der im Impressum genannte Betreiber."
        ]
      },
      {
        heading: "Leistungsbeschreibung",
        paragraphs: [
          "Die App dient der Verwaltung und Simulation von ETF-Portfolios sowie der Anzeige von Kurs- und Performancedaten. Kurse stammen aus dem offiziellen 15-Minuten-Delayed-Feed der Deutschen Börse und werden nicht als Echtzeitdaten vermarktet. TER-Kennzahlen kommen aus einer selbst gepflegten Liste. Angaben können unvollständig, verspätet oder fehlerhaft sein.",
          "Der Betreiber kann Funktionen anpassen, erweitern oder einstellen, soweit keine zwingenden gesetzlichen Rechte entgegenstehen."
        ]
      },
      {
        heading: "Zulässige Nutzung",
        bullets: [
          "Keine missbräuchliche Nutzung oder Umgehung von Sicherheitsmechanismen",
          "Keine automatisierten Angriffe oder unautorisierte Zugriffe",
          "Keine Nutzung für rechtswidrige Inhalte oder Zwecke"
        ]
      },
      {
        heading: "Finanz- und Anlagerisiko",
        paragraphs: [
          "Die App stellt keine Finanz-, Anlage-, Steuer- oder Rechtsberatung dar und ist keine Anlagevermittlung.",
          "Angezeigte Kurse, Kennzahlen und Simulationen dienen ausschließlich der Information und Demonstration. Anlageentscheidungen dürfen nicht allein auf Grundlage dieser App getroffen werden."
        ]
      },
      {
        heading: "Verfügbarkeit",
        paragraphs: [
          "Ein unterbrechungsfreier oder fehlerfreier Betrieb wird nicht zugesichert. Wartungen, Störungen oder ausfallende Datenquellen können die Verfügbarkeit beeinflussen."
        ]
      },
      {
        heading: "Haftung",
        paragraphs: [
          "Der Betreiber haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper und Gesundheit.",
          "Zwingende gesetzliche Haftung, insbesondere nach dem Produkthaftungsgesetz, bleibt unberührt. Im Übrigen ist die Haftung im gesetzlich zulässigen Umfang beschränkt. Gesetzliche Rechte von Verbrauchern bleiben unberührt."
        ]
      },
      {
        heading: "Änderungen dieser Bedingungen",
        paragraphs: [
          "Der Betreiber kann diese Nutzungsbedingungen für die Zukunft anpassen. Maßgeblich ist die in der App veröffentlichte Fassung."
        ]
      },
      {
        heading: "Sprache, anwendbares Recht und Gerichtsstand",
        paragraphs: [
          "Die Oberfläche der App kann auf Deutsch oder Englisch angezeigt werden. Verbindlich sind allein die deutschen Rechtstexte (Impressum, Datenschutzerklärung, Cookie-Hinweise und diese Nutzungsbedingungen). Die englische Oberfläche ist eine unverbindliche Übersetzung der Bedienung, nicht der Rechtstexte.",
          "Es gilt das Recht der Bundesrepublik Deutschland. Zwingende Verbraucherschutzvorschriften des Staates, in dem du dich gewöhnlich aufhältst, bleiben unberührt.",
          "Soweit gesetzlich zulässig, ist Gerichtsstand der Sitz des im Impressum genannten Betreibers. Gesetzliche Gerichtsstände für Verbraucher bleiben unberührt."
        ]
      }
    ]
  }
};
