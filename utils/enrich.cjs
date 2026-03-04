const fs = require('fs');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');
const inquirer = require('inquirer');

// --- CONFIGURACIÓN ---
const PATH_PARTIDOS = path.join(__dirname, 'data', 'partidos.json');
const DIR_DIPUTADOS = path.join(__dirname, 'data', 'candidatos');
const SLEEP_TIME = 5000; // 5 segundos

// Headers comunes para las peticiones
const HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:147.0) Gecko/20100101 Firefox/147.0'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- MAPEO DE DATOS ---
const mapEducacion = (data) => {
    const basica = data.formacionAcademica?.educacionBasica;
    
    // Mapeo de superior (Universitaria + Posgrado)
    const mapearSuperior = (lista, esPostgrado = false) => {
        if (!lista) return [];
        return lista.map(edu => ({
            grado: edu.carreraUni || edu.txEspecialidadPosgrado || "NO ESPECIFICA",
            centro_educativo: edu.universidad || edu.txCenEstudioPosgrado || "NO ESPECIFICA",
            concluido: edu.concluidoEduUni === "SI" || edu.concluidoPosgrado === "SI",
            postgrado: esPostgrado,
            fecha_conclusion: edu.anioBachiller || edu.txAnioPosgrado || null
        }));
    };

    return {
        primaria: basica?.concluidoEduPrimaria === "SI",
        secundaria: basica?.concluidoEduSecundaria === "SI",
        tecnico: mapearSuperior(data.formacionAcademica?.educacionTecnico),
        universitario: [
            ...mapearSuperior(data.formacionAcademica?.educacionUniversitaria, false),
            ...mapearSuperior(data.formacionAcademica?.educacionPosgrado, true)
        ]
    };
};

const mapExperiencia = (data) => {
    if (!data.experienciaLaboral) return [];
    return data.experienciaLaboral.map(exp => ({
        centro_trabajo: exp.centroTrabajo,
        ocupacion: exp.ocupacionProfesion,
        periodo: `${exp.anioTrabajoDesde} - ${exp.anioTrabajoHasta || 'Actualidad'}`,
        politica: false // Por defecto false, se podría cruzar con trayectoria si se desea
    }));
};

const mapSentencias = (data) => {
    if (!data.sentenciaPenal && !data.sentenciaObliga) return [];
    return data.sentenciaPenal.map(s => ({
        id_expediente: s.txExpedientePenal,
        delito: s.txDelitoPenal,
        fallo: s.txFalloPenal,
        fecha: s.feSentenciaPenal,
        tx_pena: s.txModalidad,
        comentario: s.txComentario
    }))
};

// --- LÓGICA DE API ---
async function fetchHojaVida(idPartido, dni) {
    // 1. Obtener ID de Hoja de Vida
    const resId = await axios.post('https://web.jne.gob.pe/serviciovotoinformado/api/votoinf/HVConsolidado', {
        idProcesoElectoral: 124,
        idOrganizacionPolitica: idPartido.toString(),
        strDocumentoIdentidad: dni
    }, { headers: HEADERS });

    const idHojaVida = resId.data?.data?.oDatosPersonales?.idHojaVida;
    if (!idHojaVida) return null;

    // 2. Obtener detalle completo
    const resDetail = await axios.get(`https://web.jne.gob.pe/serviciovotoinformado/api/votoinf/hojavida?idHojaVida=${idHojaVida}`, { headers: HEADERS });
    return resDetail.data;
}

// --- FLUJO PRINCIPAL ---
async function main() {
    console.log(chalk.cyan.bold('\n🗳️  Enriquecedor de Candidatos JNE 2026\n'));

    // Cargar partidos y ordenar por siglas
    const partidos = JSON.parse(fs.readFileSync(PATH_PARTIDOS, 'utf8'))
        .sort((a, b) => a.siglas.localeCompare(b.siglas));

    // Preguntar por retomar
    const { resume } = await inquirer.prompt([
        { type: 'confirm', name: 'resume', message: '¿Deseas retomar desde un partido específico?', default: false }
    ]);

    let startIndex = 0;
    if (resume) {
        const { sigla } = await inquirer.prompt([
            { type: 'input', name: 'sigla', message: 'Ingresa las siglas del partido para empezar (ej: PLG):' }
        ]);
        startIndex = partidos.findIndex(p => p.siglas.toUpperCase() === sigla.toUpperCase());
        if (startIndex === -1) {
            console.log(chalk.red('Partido no encontrado. Empezando desde el inicio.'));
            startIndex = 0;
        }
    }

    for (let i = startIndex; i < partidos.length; i++) {
        const partido = partidos[i];
        const filePath = path.join(DIR_DIPUTADOS, `${partido.siglas}.json`);

        if (!fs.existsSync(filePath)) {
            console.log(chalk.yellow(`⚠️  Archivo no encontrado para ${partido.siglas}, saltando...`));
            continue;
        }

        console.log(chalk.blue.bold(`\n📂 Procesando: ${partido.nombre} (${partido.siglas})`));
        let candidatos = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        for (let j = 0; j < candidatos.length; j++) {
            const c = candidatos[j];
            
            // Si ya tiene educación procesada (para no repetir si se detiene el script)
            if (c.educacion) {
                console.log(chalk.gray(`  ⏭️  ${c.nombre} ${c.apellido_p} ya procesado.`));
                continue;
            }

            try {
                process.stdout.write(chalk.white(`  🔍 Consultando a: ${c.nombre} ${c.apellido_p}... `));
                
                const dataFull = await fetchHojaVida(partido.id, c.dni);
                
                if (dataFull) {
                    c.educacion = mapEducacion(dataFull);
                    c.experiencia = mapExperiencia(dataFull);
                    c.sentencias = mapSentencias(dataFull);
                    process.stdout.write(chalk.green('¡ÉXITO!\n'));
                } else {
                    process.stdout.write(chalk.yellow('SIN HOJA DE VIDA\n'));
                }

                // Guardar progreso después de cada candidato exitoso
                fs.writeFileSync(filePath, JSON.stringify(candidatos, null, 2));

                // Esperar 5 segundos
                await sleep(SLEEP_TIME);

            } catch (error) {
                console.log(chalk.red('\n❌ ERROR'));
                const { retry } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'retry',
                    message: `Ocurrió un error con ${c.nombre} (${error.message}). ¿Deseas continuar con el siguiente?`,
                    default: true
                }]);
                if (!retry) process.exit(0);
            }
        }

        console.log(chalk.green.bold(`\n✅ Finalizado: ${partido.siglas}`));
        
        if (i < partidos.length - 1) {
            const { next } = await inquirer.prompt([{
                type: 'confirm',
                name: 'next',
                message: `¿Deseas continuar con el siguiente partido (${partidos[i+1].siglas})?`,
                default: true
            }]);
            if (!next) break;
        }
    }

    console.log(chalk.cyan.bold('\n🏁 Proceso completado.'));
}

main();