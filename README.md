# Tempoposte
Objet JavaScript permettant d’encoder et de décoder un code de suivi de la Tempoposte.
Aucune dépendance n’est nécessaire.

## Décodage d’un numéro de suivi
Sauf contrainte technique, le plus simple est d’appeler directement la fonction :
```
let contexte = TrackingCode.decode()
```
Cette dernière va rechercher le paramètre GET ```code``` et l’utiliser commme un numéro de suivi.
Pour forcer un code particulier, il est possible de passer le code de suivi de colis en paramètre de la fonction :
```
let contexte = TrackingCode.decode("92UDMH")
```
La fonction va retourner un _contexte_, c'est à dire un objet JavaScript contenant les informations de contexte de la numérisation du colis :
```
{
	"code": "92UDMH",
	"date": "2026-04-12T15:27:30.000Z",
	"bulle": 5,
	"mediaCount": 2,
	"hasAudio": 1
}
```
* `code` : le code de suivi décodé
* `date` : la date d’envoi du code de type `Date`
* `bulle` : le numéro de l’activité où l’envoi a eu lieu
* `mediaCount` : le nombre de médias scannés avec le tickets (par exemple, une maquette et un dessin font 2 médias dans l’envoi)
* `hasAudio` : le·la visiteur·euse a-t-il laissé un témoignage audio ?

## Encodage d’un numéro de suivi
À l’opposé de la fonction de décodage, la fonction `TrackingCode.encode` retourne un numéro de suivi pour un _contexte_ donné. Par exemple :
```
let code = TrackingCode.encode({
	date: new Date(),
	bulle: 2,
	mediaCount: 1,
	hasAudio: 0
});
```
retournera un code de suivi à la date actuelle, pour la bulle 2, contenant 1 seul média et aucun témoignage audio.
