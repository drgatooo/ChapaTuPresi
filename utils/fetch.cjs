const fs = require('fs');
const path = require('path');

// --- CONFIGURACIÓN ---
const INPUT_FILE = 'parlamento.json'; // Cambia esto según el archivo que proceses (diputados.json, senadores.json, etc.)
const OUTPUT_DIR = path.join(__dirname, 'data', 'candidatos');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// --- UTILIDADES ---
const slugify = (text) => {
    return text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
};

const mapCargo = (cargo) => {
    const mapping = {
        "PRESIDENTE DE LA REPÚBLICA": "PRESIDENTE",
        "PRIMER VICEPRESIDENTE DE LA REPÚBLICA": "PRIMER_VICEPRESIDENTE",
        "SEGUNDO VICEPRESIDENTE DE LA REPÚBLICA": "SEGUNDO_VICEPRESIDENTE",
        "REPRESENTANTE ANTE EL PARLAMENTO ANDINO": "PARLAMENTO_ANDINO"
    };
    return mapping[cargo] || cargo;
};

const sanitizeFileName = (name) => {
    return name.replace(/[<>:"/\\|?*]/g, '').trim();
};

// --- LÓGICA DE PROCESAMIENTO ---
const processData = () => {
    try {
        console.log(`🚀 Iniciando procesamiento de: ${INPUT_FILE}...`);
        
        const rawData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
        const incomingCandidates = rawData.data;

        // Cache temporal para no leer el mismo archivo de disco 1000 veces
        // Estructura: { "Nombre del Partido": { "DNI": { objetoCandidato } } }
        const partyCache = {};

        incomingCandidates.forEach(c => {
            const partyName = c.strOrganizacionPolitica;
            const dni = c.strDocumentoIdentidad;
            const currentCargo = mapCargo(c.strCargo);
            const fileName = `${sanitizeFileName(partyName)}.json`;
            const filePath = path.join(OUTPUT_DIR, fileName);

            // 1. Si el partido no está en el cache, intentamos cargarlo del disco
            if (!partyCache[partyName]) {
                if (fs.existsSync(filePath)) {
                    const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    // Convertimos el array existente en un objeto indexado por DNI para búsqueda rápida
                    partyCache[partyName] = existingData.reduce((acc, curr) => {
                        acc[curr.dni] = curr;
                        return acc;
                    }, {});
                    console.log(`📂 Cargado archivo existente: ${fileName}`);
                } else {
                    partyCache[partyName] = {};
                }
            }

            // 2. Lógica de unificación
            if (partyCache[partyName][dni]) {
                // El candidato ya existe (en este archivo o en uno previo)
                // Verificamos si el cargo ya está en su lista para no duplicar
                if (!partyCache[partyName][dni].cargo.includes(currentCargo)) {
                    partyCache[partyName][dni].cargo.push(currentCargo);
                }
            } else {
                // Candidato nuevo
                const fullFullName = `${c.strNombres} ${c.strApellidoPaterno} ${c.strApellidoMaterno}`;
                partyCache[partyName][dni] = {
                    slug: slugify(fullFullName),
                    nombre: c.strNombres,
                    apellido_p: c.strApellidoPaterno,
                    apellido_m: c.strApellidoMaterno,
                    dni: dni,
                    foto_url: `https://mpesije.jne.gob.pe/apidocs/${c.strGuidFoto}.jpg`,
                    region: c.strDepartamento,
                    educacion: null,
                    experiencia: null,
                    sentencias: null,
                    alertas: null,
                    cv_url: null,
                    cargo: [currentCargo],
                    etiquetas: [],
                    numero_lista: c.intPosicion
                };
            }
        });

        // 3. Guardar (Sobrescribir los archivos con la data mergeada)
        console.log('\n💾 Guardando cambios...');
        Object.keys(partyCache).forEach(partyName => {
            const fileName = `${sanitizeFileName(partyName)}.json`;
            const filePath = path.join(OUTPUT_DIR, fileName);
            const candidatesArray = Object.values(partyCache[partyName]);

            fs.writeFileSync(filePath, JSON.stringify(candidatesArray, null, 2), 'utf8');
        });

        console.log('✨ Proceso finalizado. Data integrada correctamente.');

    } catch (error) {
        console.error('❌ Error crítico:', error);
    }
};

processData();