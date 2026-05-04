# Tempopost — Week-end des 40ans de la CSI
Objet JavaScript permettant d’encoder et de décoder un code de suivi de la Tempoposte.
Aucune dépendance n’est nécessaire.

## Décodage d’un numéro de suivi
Sauf contrainte technique, le plus simple est d’appeler directement la fonction :
```
const contexte = TrackingCode.decode()
```
Cette dernière va rechercher le paramètre GET ```code``` et l’utiliser commme un numéro de suivi.
Pour forcer un code particulier, il est possible de passer le code de suivi de colis en paramètre de la fonction :
```
const contexte = TrackingCode.decode("2VH08")
```
La fonction va retourner un _contexte_, c'est à dire un objet JavaScript contenant les informations de contexte de la numérisation du colis :
```
{
	"code": "2VH08",
	"date": "2026-05-30T13:27:12.000Z",
	"bulle": 2,
	"hasAudio": 0
}
```
* `code` : le code de suivi décodé
* `date` : la date d’envoi du code de type `Date`
* `bulle` : le numéro de l’activité où l’envoi a eu lieu
* `hasAudio` : le·la visiteur·euse a-t-il laissé un témoignage audio ?

## Encodage d’un numéro de suivi
À l’opposé de la fonction de décodage, la fonction `TrackingCode.encode` retourne un numéro de suivi pour un _contexte_ donné. Par exemple :
```
const code = TrackingCode.encode({
	date: new Date(),
	bulle: 5,
	hasAudio: 1
});
```
retournera un code de suivi à la date actuelle, pour la bulle 5, avec un témoignage audio.

## Nom des bulles
Il est possible de transformer le numéro de bulle (entier entre 0 et 7) en nom d'expérience en français :
```
const context = {
	…
	bulle: 5,
	…
});
const bulleName = TrackingCode.common.bulles[context.bulle]
```
La bulle n°5 devrait retourner l'objet suivant :
```
{
	name: "Ville à hauteur d’enfant",
	localisation: "Balcon",
}```
