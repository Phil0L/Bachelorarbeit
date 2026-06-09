# Enhancing BPMNGen with Prompting Strategies for Automated BPMN 2.0 Process Model Generation

Dieses Repository enthält die Bachelorarbeit von **Philipp Letschka**.

Die [Bachelorarbeit](BA_Philipp_Letschka_2025.pdf) kann hier gelesen werden.

Das Programm ist auf [bpmngen.de](https://bpmngen.de) als Web Applikation verfügbar.

## Über diese Arbeit
Die Modellierung von Geschäftsprozessen mit BPMN 2.0 ist oft ein zeitaufwendiger und fehleranfälliger Vorgang. Obwohl Large Language Models (LLMs) großes Potenzial zur Automatisierung bieten, scheitern sie bei direkter Generierung häufig an den strengen syntaktischen und semantischen Vorgaben des BPMN-Standards. Diese Bachelorarbeit setzt an genau dieser Problematik an: Sie erweitert das bestehende System *BPMNGen* um fortschrittliche Prompting-Strategien und eine moderne, dialogorientierte Architektur. Durch die Integration von Techniken wie *Chain-of-Thought*, *Reflective Prompting* und einem flexiblen Multi-Provider-Framework wird die Generierungsqualität signifikant gesteigert. Das Resultat ist ein interaktiver KI-Assistent, der den Nutzer iterativ im Chat begleitet, Fehler durch selbstständige Validierung minimiert und eine reibungslose Übersetzung von natürlicher Sprache in standardkonforme, visuell aufbereitete Prozessmodelle ermöglicht.

---

## Kern-Features & Innovationen

* **Objektorientierte Multi-LLM-Architektur:** Vollständige Umstrukturierung des Backends in ein modulares, erweiterbares Framework (Abstraktionsklasse `Ai`). Dies ermöglicht die nahtlose, einheitliche Integration unterschiedlicher KI-Anbieter wie OpenAI (Wechsel auf die moderne *Responses API*), Google Gemini, Anthropic Claude und xAI Grok.
* **Conversational Mode (Chain-of-Thought):** Einführung eines echten Dialogmodus. Das Modell legt Gedankenschritte offen (`CoT`), versteht den fortlaufenden Konversationskontext sowie den aktuellen Diagrammzustand und erlaubt iterative, schrittweise Anpassungen und Rückfragen im Chat.
* **Mischantworten & Zweistufiges Streaming:** Unterstützung von Antworten, die sowohl formatierten Klartext (Erklärungen, Rückfragen) als auch Diagrammdaten beinhalten. Textinhalte werden über *Server-Sent Events (SSE)* in Echtzeit an den Client gestreamt, während fehleranfällige Diagrammfragmente erst nach vollständiger Validierung übertragen werden.
* **Flexibles Format-Mapping (XML & JSON):** Dynamische Wahl des Zielformats. Neben einem hocheffizienten, token-sparenden proprietären JSON-Zwischenformat beherrscht das Framework die direkte Generierung von standardisiertem, nativem BPMN 2.0 XML.
* **Reflective Prompting & Schema-Constraining:** Zweistufige Generierungszyklen, bei denen das Modell Zwischenentwürfe selbstständig auf logische Inkonsistenzen und syntaktische Korrektheit prüft, kombiniert mit strikter struktureller Validierung.
* **Diagramm-Sampling:** Parallele Generierung mehrerer Modellierungsvarianten (unter Verwendung verschiedener sekundärer LLMs via `Promise.all`), aus welchen der Nutzer die beste Lösung auswählen kann.
* **Multimodale Dateiverarbeitung:** Unterstützung von direkten Datei-Uploads (z. B. bestehende Diagramme oder Prozessdokumente) mittels Base64-kodierter Data-URLs direkt innerhalb der Prompt-Struktur.

---

## Technologie-Stack

* **Backend-Framework:** Node.js mit Express.js
* **Datenbank & ORM:** PostgreSQL verwaltet über Prisma ORM
* **Frontend-Integration:** Angular unter Verwendung von [bpmn-js](https://github.com/bpmn-io/bpmn-js) zur interaktiven Visualisierung
* **Unterstützte LLM-Schnittstellen:** OpenAI Responses API, Google AI SDK, Anthropic API, xAI API

---

## API-Schnittstellen (REST)

### 1. Neuen Konversations-Thread starten
Erzeugt einen Thread zur Prozessgenerierung mit spezifischen Modell-, Modus- und Formatvorgaben.

* **URL:** `/POST /threads`
* **Payload-Beispiel (mit Diagramm-Sampling):**

```json
{
  "inputString": "Bitte generiere mir ein BPMN Diagramm, welches den Ablauf in einem Restaurant zeigt.",
  "model": "gpt-5 (xml)",
  "mode": "detail",
  "format": "xml",
  "samples": [
    "gemini-2.5-pro (xml)",
    "grok-4 (json)"
  ]
}
```

### 2. Stream-Endpunkt für interaktiven Chat
Ermöglicht das dialogbasierte, schrittweise Streamen von Text- und Diagrammupdates mittels Server-Sent Events (SSE).

* **URL:** `/GET /threads/:threadId/stream`

---

## Architekturübersicht

Die Kernlogik des Promptings und der API-Kommunikation ist über ein sauberes Vererbungsmuster entkoppelt:

```text
       ┌──────────────────────────────┐
       │         Abstract Ai          │  ◄── Zentrale Logik, Verlaufs- & 
       └──────────────┬───────────────┘      Formatkonvertierung
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ ChatGPT  │ │  Gemini  │ │  Claude  │  ◄── Provider-spezifische API-Mappings
   └──────────┘ └──────────┘ └──────────┘      (generateContent, processResponse)
```

---

Dieses Projekt wurde im Rahmen einer Abschlussarbeit (Bachelor of Science) an der **Universität Ulm** am Institut für *Datenbanken und Informationssysteme (DBIS)* entwickelt.
Der vollständige Code ist nicht veröffentlicht.

* **Autor:** Philipp Letschka (philipp.letschka@uni-ulm.de)
* **Erstgutachter:** Prof. Dr. Manfred Reichert
* **Betreuer:** Luca F. Hörner
* **Jahr:** 2025

---

## 📄 Lizenz

Dieses Projekt ist für akademische Zwecke im Rahmen der universitären Richtlinien der Universität Ulm lizenziert. Für externe Nutzung oder Weiterverwendung kontaktieren Sie bitte das Institut DBIS.
