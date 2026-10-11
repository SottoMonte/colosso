# Colosso

Sito statico in italiano per un'attività di assistenza IT, riparazioni elettroniche e servizi digitali. La home presenta le aree di lavoro e i pacchetti; `catalogo.html` offre ricerca e filtri, mentre `prodotto.html?id=ID-SERVIZIO` mostra i dettagli. Contenuti, recapiti e offerte sono gestiti in JSON e modificabili tramite Decap CMS.

Il carrello salva i servizi nel browser e permette di modificarne le quantità. L'invio prepara una richiesta d'ordine via WhatsApp, se configurato, oppure nell'app email; non raccoglie pagamenti. Gli importi sono gestiti nel CMS con `price` (euro) e `price_period` (`una tantum`, `mensile` o `annuale`); se il prezzo manca, il servizio resta da preventivare. I prezzi e la disponibilità vanno confermati prima dell'acquisto.

Il codice di un buono Cartaway viene incluso nella richiesta perché Colosso ne verifichi validità e condizioni. Il sito non calcola né applica sconti in autonomia: per farlo occorre integrare una fonte autorevole condivisa con Cartaway, ad esempio un'API di verifica, oltre a definire le regole dei buoni.

## Avvio locale

Dalla cartella del progetto avvia un server statico:

```bash
python3 -m http.server 4173
```

Apri `http://localhost:4173`. Il CMS in `/admin` va configurato prima di consentire modifiche online.

## Dati da completare

- `data/site.json`: nome, presentazione, zona, recapiti e dati legali. I recapiti e i dati legali non sono stati inventati: inserirli e verificarli prima della pubblicazione.
- `data/services.json`: riparazioni, servizi digitali, automazioni, marketing e pacchetti. Inserire nel CMS prezzi, periodi, descrizioni, condizioni, immagini e canoni approvati dall'azienda; i prezzi attualmente non sono stati forniti.
- Le immagini iniziali sono dimostrative e ospitate su Unsplash. Prima della pubblicazione, usare immagini approvate e verificare che rappresentino i servizi offerti.

## Buoni Cartaway

Il campo “Codice buono Cartaway” trasmette il codice nella richiesta WhatsApp/email per la verifica da parte di Colosso. Per applicare automaticamente lo sconto durante un acquisto servono almeno: formato e regole dei codici, criteri di validità (scadenza, importo, cumulabilità e servizi ammessi) e un endpoint o archivio condiviso che ne confermi lo stato. Non validare i buoni soltanto nel browser: i dati client-side sono modificabili.

## Pubblicazione e CMS

1. Collega il progetto al repository GitHub corretto e configura Netlify o un hosting statico equivalente.
2. In `admin/config.yml` sostituisci `OWNER/REPOSITORY` e `SOSTITUISCI-CON-LA-SITE-ID-DECAP-TURBO` con i valori del repository e del sito Decap Turbo di Colosso.
3. Configura l'URL pubblico dell'area `/admin/`, poi verifica accesso e salvataggio prima di consegnare il CMS.
4. Prima del lancio, aggiorna recapiti, dati legali, copertura, immagini, condizioni dei pacchetti e modalità di gestione dei buoni Cartaway.

Il progetto non contiene credenziali o collegamenti a repository di clienti precedenti. Il backend CMS resta intenzionalmente non configurato finché non vengono inseriti i riferimenti definitivi di Colosso.