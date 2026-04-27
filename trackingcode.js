/**
 * Objet permettant l'encodage et le décodage d'un code de suivi de la Tempoposte
 */
let TrackingCode = {
	/**
	 * Constantes communes au dispotif in-situ et en ligne
	 */
	universal: {
		/**
		 * Constantes communes au dispotif in-situ et en ligne
		 */
		startingDateTime: new Date(2026, 3,  1,  0, 0, 0).valueOf(), //Début du décompte le 1er avril 2026,
		endingDateTime:   new Date(2026, 4, 31, 20, 0, 0).valueOf(), //Fin de l'événement (pour vérifier la longueur en bits du stockage)
		bulleMax:      7, // Nombre max de bulles
		mediaCountMax: 3, // Nombre max de médias par tickets
		hasAudioMax:   1, // Présence ou non d'audio
		saltMax:       Math.pow(2, 3), // Quantité max de salage
		sequences: { // Ordre de l'encodage et du décodage
			header:  ["salt"],
			payload: ["timestamp", "bulle", "mediaCount", "hasAudio"],
			infos: ["code", "date", "bulle", "mediaCount", "hasAudio", "salt"],
		}
	},


	/**
	 * Fonctions clés pour le codage-décodage
	 */

	/**
	 * Initialise le codeur/décodeur de numéro de suivi
	 * @param  {Function} readyCallback (Facultatif) Callback appelé quand l'initialisation est terminée
	 */
	init: function(readyCallback) {
		//Concatère les infos
		this.universal.sequences.all = this.universal.sequences.header.concat(this.universal.sequences.payload);

		//Traitement sur l'heure : tente de réduire au maximum la taille des données, et encode la position de la date entre deux bornes min/max
		this.universal.timestampMax = this.simplifyDateTime(this.universal.endingDateTime);
		
		//Pré-calcule les tailles binaires des éléments encodés dans la séquence
		for (const sequenceItem of this.universal.sequences.all)
			this.universal[`${sequenceItem}Max`] = this.getBinaryFormOf(0, this.universal[`${sequenceItem}Max`]);

		//Somme des longueurs en bits
		this.universal.bits = 0;
		for (const sequenceItem of this.universal.sequences.all)
			this.universal.bits += this.universal[`${sequenceItem}Max`].bits;

		//Nombre de caractère du numéro de tracking : actuel et potentiel (si on utilise tous les bits)
		this.universal.codeLength = Math.ceil(this.universal.bits / 5);
		this.universal.bitsMax = this.universal.codeLength * 5

		//Démarre le salage itératif
		this.saltIndex = 0;

		//Prêt !
		console.log(`Initialisation de l'encodage du numéro de suivit sur ${this.universal.bits} bits soit ${this.universal.codeLength} caractères de codage. ${this.universal.bitsMax - this.universal.bits} bits de rab`, this.universal);
		if(readyCallback)
			readyCallback.call();
	},

	/**
	 * Génère le contexte de numérisation
	 * @param  {Function} context Objet contenant le contexte (timestamp, bulle, nombre de médias, présence d’un témoignage) à encoder
	 * @return {Object}    	      Un numéro de suivi
	 */
	encode: function(context) {
		context.binary = {};
		context.infos = {};

		//Traitement sur l'heure : tente de réduire au maximum la taille des données, et encode la position de la date entre deux bornes min/max
		context.timestamp = this.simplifyDateTime(context.date.valueOf());

		//Choiti un salage
		context.salt = this.saltIndex;
		this.saltIndex = (this.saltIndex + 1) % (this.universal.saltMax.max + 1)

		//Construit le header du message binaire
		context.binary.word = ""
		for (const sequenceItem of this.universal.sequences.header) {
			//Conversion binaire
			context.binary[sequenceItem] = this.getBinaryFormOf(context[sequenceItem], this.universal[`${sequenceItem}Max`].max);

			//Concaténe le mot binaire
			context.binary.word += context.binary[sequenceItem].word
		}

		//Construit le payload message binaire
		let payload = "";
		for (const sequenceItem of this.universal.sequences.payload) {
			//Conversion binaire
			context.binary[sequenceItem] = this.getBinaryFormOf(context[sequenceItem], this.universal[`${sequenceItem}Max`].max);

			//Concaténe le mot binaire
			payload += context.binary[sequenceItem].word
		}

		//Sallage du payload
		payload = this.circularString(payload, context.salt);

		//Finalisation du message binaire
		context.binary.word += payload;
		context.binary.bits = context.binary.word.length;
		
		//Convertit le binaire en nombre
		context.binary.val = parseInt(context.binary.word, 2);

		//Convertit le nombre en base32
		context.code = this.toBase32(context.binary.val).padStart(this.universal.codeLength, "0").toUpperCase();

		//Package proprement toutes les infos utiles pour la suite
		console.log(`Encodage avec ${context.code} du contexte`, context);
		for (const sequenceItem of this.universal.sequences.infos) {
			console.log(`\t${sequenceItem} = ${context[sequenceItem]}`);
			context.infos[sequenceItem] = context[sequenceItem];
		}

		return context;
	},

	/**
	 * Décode un numéro de suivi en contexte de numérisation
	 * @param  {Function} code Un numéro de suivi
	 * @return {Object}    	  Objet contenant le contexte (timestamp, bulle, nombre de médias, présence d’un témoignage) à encoder
	 */
	decode: function(code) {
		let context = null;

		//Si le code n'est pas renseigné, on le prends en GET
		if(code == undefined)
			code = new URLSearchParams(window.location.search).get("code");

		//Si un code est bien renseigné
		if(code) {
			context = {code: code, binary: {}, infos: {}};

			//Convertit le base32 en nombre
			context.binary.val = this.fromBase32(context.code);

			//Convertit le nombre en binaire
			context.binary.word = context.binary.val.toString(2).padStart(this.universal.bits, "0");

			//Déconstruit le message binaire en mots
			let header = context.binary.word;
			//Extrait le header
			for (const sequenceItem of this.universal.sequences.header) {
				//Extrait les n premiers bits et les convertit en int
				context.binary[sequenceItem] = this.setBinaryFormOf(header.substring(0, this.universal[`${sequenceItem}Max`].bits));

				//Retire les n premiers bits pour l'itération suivante
				header = header.substring(this.universal[`${sequenceItem}Max`].bits);

				//Affecte les valeurs au contexte
				context[sequenceItem] = context.binary[sequenceItem].val;
			}

			//Dé-sale le payload
			let payload = this.circularString(header, -context.salt);

			//Extrait le payload
			for (const sequenceItem of this.universal.sequences.payload) {
				//Extrait les n premiers bits et les convertit en int
				context.binary[sequenceItem] = this.setBinaryFormOf(payload.substring(0, this.universal[`${sequenceItem}Max`].bits));

				//Retire les n premiers bits pour l'itération suivante
				payload = payload.substring(this.universal[`${sequenceItem}Max`].bits);

				//Affecte les valeurs au contexte
				context[sequenceItem] = context.binary[sequenceItem].val;
			}

			//Traitement sur l'heure - reconstruit une date-heure normale
			context.date = this.constructDateTime(context.timestamp);

			//Vérifie la date
			context.check = (this.universal.startingDateTime <= context.date) && (context.date <= this.universal.endingDateTime);

			//Retour
			if(context.check) {
				console.log(`Décodage de ${code}`, context);
				for (const sequenceItem of this.universal.sequences.infos) {
					console.log(`\t${sequenceItem} = ${context[sequenceItem]}`);
					context.infos[sequenceItem] = context[sequenceItem];
				}
			}
			else
				console.error(`Erreur de décodage de ${code}`, context);
		}
		return context;
	},



	/**
	 * Autres fonctions utilitaires nécessaires au codage-décodage
	 */

	//Retourne une date simplifiée à partir d'une date normale
	simplifyDateTime: function(timestamp) {
		//Retire la date de référence à la date en argument, supprime les millisecondes (/ 1000) et réduit les secondes (/ 10)
		return Math.floor((timestamp - this.universal.startingDateTime) / 1000 / 10);
	},
	//Retourne une date normale à partir d'une date simplifiée
	constructDateTime: function(simplifiedDateTime) {
		//Ajoute les secondes (* 60), les millisecondes (* 1000) et ajoute la date de référence
		return new Date((simplifiedDateTime * 10 * 1000) + this.universal.startingDateTime);
	},

	//Retourne la représentation binaire d'un nombre, connaissant sa borne supérieure
	getBinaryFormOf: function(val, max) {
		let binaryForm = {
			val:  val,
			word: val.toString(2),
			max:  max,
			bits: max.toString(2).length,
		};
		binaryForm.word = binaryForm.word.padStart(binaryForm.bits, "0");
		return binaryForm;
	},
	//Convertir la représentation binaire d'un nombre
	setBinaryFormOf: function(word) {
		return {
			val:  parseInt(word, 2),
			word: word
		};
	},

	//Buffer circulaire (en string) et renvoie le buffer décalé de n positions
	circularString: function(str, n) {
		let circular = "";
		//console.log(`Salage de ${str} (${str.length}) de ${n} caractères`);
		if(n < 0)
			n = str.length + n;
		circular = str.substring(n) + str.substring(0, n);
		//console.log(`Salage de ${str} (${str.length}) de ${n} caractères`, circular);
		return circular;
	},

	//Encode ou décode un nombre de et vers la Base32 Crockford
	toBase32: function(val, length=0) {
		let str = val.toString(32).toUpperCase();
		
		//Padding si nécessaire
		if(length > 0)
			str = str.padStart(length, "0");

		//Déplace/retire les lettres confusantes I, L, O, 5 vers W, X, Y, Z
		str = str.replaceAll("I", "W").replaceAll("L", "X").replaceAll("O", "Y").replaceAll("5", "Z");

		return str;
	},
	fromBase32: function(str) {
		str = str.toUpperCase();
		//Remlplace les lettres confusantes I, L, O, 5 vers 1, 1, 0, S
		str = str.replaceAll("I", "1").replaceAll("L", "1").replaceAll("O", "0").replaceAll("5", "S");
		//Replace les lettres déplacées W, X, Y, Z vers I, L, O, 5 
		str = str.replaceAll("W", "I").replaceAll("X", "L").replaceAll("Y", "O").replaceAll("Z", "5");

		return parseInt(str, 32);
	}
}