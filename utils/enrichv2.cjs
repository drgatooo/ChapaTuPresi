const fs = require('fs');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- CONFIGURACIÓN ---
const PATH_PARTIDOS = path.join(__dirname, '..', 'data', 'partidos.json');
const DIR_DIPUTADOS = path.join(__dirname, '..', 'data', 'candidatos');
const SLEEP_TIME = 300;

const HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:147.0) Gecko/20100101 Firefox/147.0'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- MAPEO DE DATOS MEJORADO ---

const mapEducacion = (data) => {
    const basica = data.formacionAcademica?.educacionBasica;
    const mapearSuperior = (lista, esPostgrado = false) => {
        if (!lista) return [];
        return lista.map(edu => ({
            grado: edu.carreraUni || edu.txEspecialidadPosgrado || edu.carreraTecnico || "NO ESPECIFICA",
            centro_educativo: edu.universidad || edu.txCenEstudioPosgrado || edu.cenEstudioTecnico || "NO ESPECIFICA",
            concluido: edu.concluidoEduTecnico === "1" || edu.concluidoEduUni === "SI" || edu.concluidoPosgrado === "SI",
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

const mapExperienciaCompleta = (data) => {
    const lista = [];

    // 1. Experiencia Laboral Estándar
    if (data.experienciaLaboral) {
        data.experienciaLaboral.forEach(exp => {
            lista.push({
                centro_trabajo: exp.centroTrabajo,
                ocupacion: exp.ocupacionProfesion,
                periodo: `${exp.anioTrabajoDesde} - ${exp.anioTrabajoHasta || 'Actualidad'}`,
                politica: false
            });
        });
    }

    // 2. Trayectoria - Cargos de Elección (Política: True)
    if (data.trayectoria?.cargoEleccion) {
        data.trayectoria.cargoEleccion.forEach(c => {
            lista.push({
                centro_trabajo: c.orgPolCargoElec,
                ocupacion: c.cargoEleccion,
                periodo: `${c.anioCargoElecDesde} - ${c.anioCargoElecHasta}`,
                politica: true
            });
        });
    }

    // 3. Trayectoria - Cargos Partidarios (Política: True)
    if (data.trayectoria?.cargoPartidario) {
        data.trayectoria.cargoPartidario.forEach(c => {
            lista.push({
                centro_trabajo: c.orgPolCargoPartidario,
                ocupacion: c.CargoPartidario,
                periodo: `${c.anioCargoPartiDesde} - ${c.anioCargoPartiHasta}`,
                politica: true
            });
        });
    }

    return lista;
};

const mapSentenciasUnificadas = (data) => {
    const sentencias = [];

    // Penales
    if (data.sentenciaPenal) {
        data.sentenciaPenal.forEach(s => {
            sentencias.push({
                id_expediente: s.txExpedientePenal,
                delito: s.txDelitoPenal,
                fallo: s.txFalloPenal,
                fecha: s.feSentenciaPenal,
                tx_pena: s.txModalidad,
                comentario: s.txComentario
            });
        });
    }

    // Obligaciones (Civiles/Alimentos)
    if (data.sentenciaObliga) {
        data.sentenciaObliga.forEach(s => {
            sentencias.push({
                id_expediente: s.txExpedienteObliga,
                delito: `[${s.txMateriaSentencia}]`, // Se usa la materia como delito
                fallo: s.txFalloObliga,
                fecha: "No especificada",
                tx_pena: s.txOrganoJuridicialObliga, // Usamos el órgano como contexto de pena
                comentario: s.txComentario
            });
        });
    }

    return sentencias;
};

// --- LÓGICA DE API ---
async function fetchHojaVida(idPartido, dni) {
    const resId = await axios.post('https://web.jne.gob.pe/serviciovotoinformado/api/votoinf/HVConsolidado', {
        idProcesoElectoral: 124,
        idOrganizacionPolitica: idPartido.toString(),
        strDocumentoIdentidad: dni
    }, { headers: HEADERS, timeout: 15000 });

    const idHojaVida = resId.data?.data?.oDatosPersonales?.idHojaVida;
    if (!idHojaVida) return null;

    const resDetail = await axios.get(`https://web.jne.gob.pe/serviciovotoinformado/api/votoinf/hojavida?idHojaVida=${idHojaVida}`, { headers: HEADERS, timeout: 30000 });
    return resDetail.data;
}

// --- PROMPT CON TIMEOUT ---
async function confirmNextWithTimeout(message, seconds = 10) {
    let timeoutRef;
    const timeoutPromise = new Promise((resolve) => {
        timeoutRef = setTimeout(() => {
            console.log(chalk.italic(`\n⌛ Sin respuesta por ${seconds}s. Continuando automáticamente...`));
            resolve({ next: true });
        }, seconds * 1000);
    });

    const promptPromise = inquirer.prompt([{ type: 'confirm', name: 'next', message, default: true }]);

    const result = await Promise.race([promptPromise, timeoutPromise]);
    clearTimeout(timeoutRef);
    return result;
}

// --- FLUJO PRINCIPAL ---
async function main() {
    console.log(chalk.magenta.bold('\n🕵️  Enriquecedor de Candidatos JNE - Pro'));

    const partidos = JSON.parse(fs.readFileSync(PATH_PARTIDOS, 'utf8'))
        .sort((a, b) => a.siglas.localeCompare(b.siglas));

    const { resume } = await inquirer.prompt([{ type: 'confirm', name: 'resume', message: '¿Retomar desde un partido?', default: false }]);

    let startIndex = 0;
    if (resume) {
        const { sigla } = await inquirer.prompt([{ type: 'input', name: 'sigla', message: 'Siglas del partido:' }]);
        startIndex = partidos.findIndex(p => p.siglas.toUpperCase() === sigla.toUpperCase());
        if (startIndex === -1) startIndex = 0;
    }

    for (let i = startIndex; i < partidos.length; i++) {
        const partido = partidos[i];
        const filePath = path.join(DIR_DIPUTADOS, `${partido.siglas}.json`);

        if (!fs.existsSync(filePath)) continue;

        console.log(chalk.blue.bold(`\n🏛️  Partido: ${partido.nombre}`));
        let candidatos = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        for (let j = 0; j < candidatos.length; j++) {
            const c = candidatos[j];
            if (c.educacion) continue;

            try {
                process.stdout.write(chalk.white(`  (${j + 1}/${candidatos.length}) 👤 ${c.nombre} ${c.apellido_p}... `));

                const dataFull = await fetchHojaVida(partido.id, c.dni);

                if (dataFull) {
                    c.educacion = mapEducacion(dataFull);
                    c.experiencia = mapExperienciaCompleta(dataFull);
                    c.sentencias = mapSentenciasUnificadas(dataFull);
                    process.stdout.write(chalk.green('OK\n'));
                } else {
                    process.stdout.write(chalk.yellow('N/A\n'));
                }

                fs.writeFileSync(filePath, JSON.stringify(candidatos, null, 2));
                await sleep(SLEEP_TIME);

            } catch (error) {
                if (error.code === 'ECONNABORTED') {
                    console.log(chalk.red('\n⌛ La API del JNE tardó demasiado en responder.'));
                } else {
                    console.log(chalk.red(`\n❌ ERROR con ${c.nombre}: ${error.message}`));
                }
                // Aquí NO hay timeout, espera al usuario
                const { retry } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'retry',
                    message: `¿Ocurrió un error. Deseas intentar con el siguiente candidato?`,
                    default: true
                }]);
                if (!retry) process.exit(0);
            }
        }

        console.log(chalk.green(`\n🏁 Partido ${partido.siglas} completado.`));

        if (i < partidos.length - 1) {
            const { next } = await confirmNextWithTimeout(`¿Continuar al siguiente partido (${partidos[i + 1].siglas})?`, 10);
            if (!next) break;
        }
    }
}

main();