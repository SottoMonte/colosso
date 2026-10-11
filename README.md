# Colosso

Sito statico in italiano per un'attività di assistenza IT, riparazioni elettroniche e servizi digitali. La home presenta le aree di lavoro e i pacchetti; `catalogo.html` offre ricerca e filtri, mentre `prodotto.html?id=ID-SERVIZIO` mostra i dettagli. Contenuti, recapiti e offerte sono gestiti in JSON e modificabili tramite Decap CMS.

Il carrello salva i servizi nel browser e permette di modificarne le quantità. L'invio prepara una richiesta d'ordine via WhatsApp, se configurato, oppure nell'app email; non raccoglie pagamenti. Gli importi gestiti nel CMS con `price` (euro) e `price_period` (`una tantum`, `mensile` o `annuale`) sono tariffe indicative di partenza e vengono mostrate con "Da"; se il prezzo manca, il servizio resta da preventivare. Prezzi, voci incluse, eventuale IVA e disponibilità vanno confermati prima dell'acquisto.

Nel carrello si può simulare lo sconto Cartaway inserendo il codice e l'importo riportato sul buono: la cifra viene sottratta dal totale iniziale stimato, senza scendere sotto zero. È solo una simulazione client-side; codice, validità, importo e condizioni devono essere verificati da Colosso e lo sconto non viene applicato a un pagamento. Per la verifica automatica occorrono regole definite e una fonte autorevole condivisa con Cartaway, ad esempio un'API.

## Avvio locale

Dalla cartella del progetto avvia un server statico:

```bash
python3 -m http.server 4173
```

Apri `http://localhost:4173`. Il CMS in `/admin` va configurato prima di consentire modifiche online.

## Dati da completare

- `data/site.json`: nome, presentazione, zona, recapiti e dati legali. I recapiti e i dati legali non sono stati inventati: inserirli e verificarli prima della pubblicazione.
- `data/services.json`: riparazioni, servizi digitali, automazioni, marketing e pacchetti. I prezzi presenti sono stime iniziali non ancora approvate dall'azienda: verificarli e aggiornarli nel CMS, insieme a periodi, voci incluse, condizioni, immagini e canoni, prima della pubblicazione.
- Le immagini iniziali sono dimostrative e ospitate su Unsplash. Prima della pubblicazione, usare immagini approvate e verificare che rappresentino i servizi offerti.

## Buoni Cartaway

Nel carrello si può simulare lo sconto Cartaway inserendo l'importo riportato sul buono; il codice è facoltativo per la simulazione e può essere inviato separatamente per la verifica. Il valore viene sottratto dal totale iniziale stimato, senza scendere sotto zero. È una simulazione client-side: validità, importo e condizioni devono essere verificati da Colosso e lo sconto non viene applicato a un pagamento. Per la verifica automatica servono regole definite e una fonte autorevole condivisa con Cartaway, ad esempio un'API; non validare i buoni soltanto nel browser.

## Pubblicazione e CMS

1. Collega il progetto al repository GitHub corretto e configura Netlify o un hosting statico equivalente.
2. In `admin/config.yml` sostituisci `OWNER/REPOSITORY` e `SOSTITUISCI-CON-LA-SITE-ID-DECAP-TURBO` con i valori del repository e del sito Decap Turbo di Colosso.
3. Configura l'URL pubblico dell'area `/admin/`, poi verifica accesso e salvataggio prima di consegnare il CMS.
4. Prima del lancio, aggiorna recapiti, dati legali, copertura, immagini, condizioni dei pacchetti e modalità di gestione dei buoni Cartaway.

Il progetto non contiene credenziali o collegamenti a repository di clienti precedenti. Il backend CMS resta intenzionalmente non configurato finché non vengono inseriti i riferimenti definitivi di Colosso.