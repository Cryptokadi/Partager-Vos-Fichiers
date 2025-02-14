const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const app = express();
const port = process.env.PORT || 3000;

// Chemin du fichier pour stocker le nombre de visiteurs
const counterFilePath = 'visitorCount.txt';

// Lire le nombre de visiteurs depuis le fichier ou initialiser à 0
let visitorCount = 0;
if (fs.existsSync(counterFilePath)) {
    visitorCount = parseInt(fs.readFileSync(counterFilePath, 'utf8'), 10);
}

// Configuration de Multer pour conserver le nom d'origine
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Dossier de destination
    },
    filename: (req, file, cb) => {
        // Conserver le nom d'origine du fichier
        cb(null, file.originalname);
    },
});

const upload = multer({ storage });

// Stockage des codes de partage, des fichiers et des timestamps d'expiration
const fileCodeMap = {};

// Fonction pour générer un code unique à quatre chiffres
function generateUniqueCode() {
    let code;
    do {
        code = Math.floor(1000 + Math.random() * 9000).toString(); // Génère un code à quatre chiffres
    } while (fileCodeMap[code]); // Vérifie si le code existe déjà
    return code;
}

// Fonction pour supprimer les fichiers expirés
function cleanupExpiredFiles() {
    const now = Date.now();
    for (const code in fileCodeMap) {
        if (fileCodeMap[code].expiresAt && fileCodeMap[code].expiresAt <= now) {
            // Supprimer les fichiers associés
            fileCodeMap[code].filenames.forEach((filename) => {
                const filePath = path.join(__dirname, 'uploads', filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath); // Supprimer le fichier
                }
            });
            // Supprimer l'entrée du code
            delete fileCodeMap[code];
            console.log(`Fichiers expirés supprimés pour le code : ${code}`);
        }
    }
}

// Planifier le nettoyage toutes les heures
setInterval(cleanupExpiredFiles, 60 * 60 * 1000); // 1 heure

// Route pour uploader un fichier
app.post('/upload', upload.array('files'), (req, res) => {
    const files = req.files;
    if (!files || files.length === 0) {
        return res.status(400).send('Aucun fichier uploadé.');
    }

    // Générer un code de partage de quatre chiffres unique
    const code = generateUniqueCode();

    // Définir la date d'expiration (par exemple, 24 heures à partir de maintenant)
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 heures

    // Stocker les noms de fichiers et la date d'expiration
    fileCodeMap[code] = {
        filenames: files.map(file => file.filename),
        expiresAt: expiresAt,
    };

    // Renvoyer le code de partage
    res.send({ code });
});

// Route pour télécharger un fichier
app.get('/download/:code', (req, res) => {
    const code = req.params.code;
    const fileInfo = fileCodeMap[code];

    if (!fileInfo || !fileInfo.filenames) {
        return res.status(404).send('Code invalide ou fichier non trouvé.');
    }

    // Créer une archive ZIP
    const archive = archiver('zip', {
        zlib: { level: 9 } // Niveau de compression maximal
    });

    // Gérer les erreurs de l'archive
    archive.on('error', (err) => {
        console.error('Erreur lors de la création de l\'archive :', err);
        res.status(500).send('Erreur lors de la création de l\'archive.');
    });

    // Définir le nom du fichier ZIP et le type de réponse
    res.attachment('fichiers.zip');
    archive.pipe(res);

    // Ajouter chaque fichier à l'archive
    fileInfo.filenames.forEach((filename) => {
        const filePath = path.join(__dirname, 'uploads', filename);
        if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: filename });
        } else {
            console.error(`Fichier non trouvé : ${filename}`);
        }
    });

    // Finaliser l'archive et envoyer la réponse
    archive.finalize();
});

// Route pour récupérer le nombre de visiteurs (API)
app.get('/api/visitors', (req, res) => {
    res.json({ visitors: visitorCount });
});

// Route pour la page d'accueil
app.get('/', (req, res) => {
    // Incrémenter le compteur de visiteurs
    visitorCount++;

    // Sauvegarder le nouveau nombre de visiteurs dans le fichier
    fs.writeFileSync(counterFilePath, visitorCount.toString(), 'utf8');

    // Servir la page HTML
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Servir les fichiers statiques (HTML, CSS, JS)
app.use(express.static('public'));

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
