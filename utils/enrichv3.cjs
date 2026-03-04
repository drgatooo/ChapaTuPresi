const fs = require('fs');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// --- CONFIGURACIÓN ---
const PATH_PARTIDOS = path.join(__dirname, '..', 'data', 'partidos.json');
const DIR_CANDIDATOS = path.join(__dirname, '..', 'data', 'candidatos');
const SLEEP_TIME = 100; 
const AUTO_RETRY = true; // Si es true, reintenta automáticamente. Si es false, pregunta.

const HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- LÓGICA DE API JNE ---
async function fetchHojaVida(idPartido, dni) {
    // 1. Obtener ID de Hoja de Vida
    const resId = await axios.post('https://web.jne.gob.pe/serviciovotoinformado/api/votoinf/HVConsolidado', {
        idProcesoElectoral: 124,
        idOrganizacionPolitica: idPartido.toString(),
        strDocumentoIdentidad: dni
    }, { headers: HEADERS, timeout: 15000 });

    const idHojaVida = resId.data?.data?.oDatosPersonales?.idHojaVida;
    if (!idHojaVida) return null;

    // 2. Obtener el detalle completo
    const resDetail = await axios.get(`https://web.jne.gob.pe/serviciovotoinformado/api/votoinf/hojavida?idHojaVida=${idHojaVida}`, { 
        headers: HEADERS, 
        timeout: 20000 
    });
    
    return resDetail.data;
}

// --- FLUJO PRINCIPAL ---
async function main() {
    console.log(chalk.cyan.bold('\n🚀 Iniciando inyección de CVs y Regiones a MongoDB...'));

    const partidos = JSON.parse(fs.readFileSync(PATH_PARTIDOS, 'utf8'))
        .sort((a, b) => a.siglas.localeCompare(b.siglas));

    const { resume } = await inquirer.prompt([{ type: 'confirm', name: 'resume', message: '¿Retomar desde un partido específico?', default: false }]);

    let startIndex = 0;
    let dniStart = 0;
    if (resume) {
        const { sigla } = await inquirer.prompt([{ type: 'input', name: 'sigla', message: 'Siglas del partido (ej: AP, PL, FP):' }]);
        startIndex = partidos.findIndex(p => p.siglas.toUpperCase() === sigla.toUpperCase());
        if (startIndex === -1) {
            console.log(chalk.yellow("Partido no encontrado, empezando desde el inicio."));
            startIndex = 0;
        } else {
            const { dni } = await inquirer.prompt([{ type: 'input', name: 'dni', message: 'DNI del candidato para retomar (dejar vacío para empezar desde el partido):' }]);
            if (dni) {
                dniStart = dni;
            } else {
                dniStart = 0; // Empezar desde el inicio del partido
            }
        }
    }

    for (let i = startIndex; i < partidos.length; i++) {
        const partido = partidos[i];
        const filePath = path.join(DIR_CANDIDATOS, `${partido.siglas}.json`);

        if (!fs.existsSync(filePath)) continue;

        console.log(chalk.blue.bold(`\n🏛️  Procesando Partido: ${partido.nombre}`));
        const candidatos = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const dniStartIndex = dniStart.length > 0 ? candidatos.findIndex(c => c.dni === dniStart) : 0;

        for (let j = dniStartIndex; j < candidatos.length; j++) {
            const c = candidatos[j];
            let success = false;

            while (!success) {
                try {
                    process.stdout.write(chalk.white(`  (${j + 1}/${candidatos.length}) 👤 DNI: ${c.dni} - ${c.nombre || 'Candidato'}... `));

                    const candidato = await prisma.candidato.findUnique({ where: { dni: c.dni } });
                    if (candidato?.cv_url && candidato.cv_url !== "") {
                        process.stdout.write(chalk.magenta('Sin cambios ✅\n'));
                        success = true; continue;
                    }
                    
                    const dataFull = await fetchHojaVida(partido.id, c.dni);

                    if (dataFull && dataFull.datoGeneral) {
                        const dg = dataFull.datoGeneral;
                        
                        // Lógica de URL del PDF (Prioridad Firmado > Normal)
                        const pdfName = dg.txNombreArchivoPdfFirmado || dg.txNombreArchivoPdf;
                        const cvUrl = pdfName ? `https://mpesije.jne.gob.pe/apidocs/${pdfName}` : "";
                        
                        // Lógica de Región/Distrito
                        const postulaRegion = dg.postulaDistrito || "";

                        // Inyectar a Base de Datos usando Prisma
                        // Se usa updateMany porque DNI no es necesariamente el ID primario en Mongo, 
                        // pero funciona igual para filtrar por el campo dni.
                        await prisma.candidato.updateMany({
                            where: { dni: c.dni },
                            data: {
                                cv_url: cvUrl,
                                postula_region: postulaRegion
                            }
                        });

                        process.stdout.write(chalk.green('ACTUALIZADO ✅\n'));
                    } else {
                        process.stdout.write(chalk.yellow('SIN DATOS JNE ⚠️\n'));
                    }

                    success = true; // Salir del while de reintento
                    await sleep(SLEEP_TIME);

                } catch (error) {
                    console.log(chalk.red(`\n❌ ERROR con DNI ${c.dni}: ${error.message}`));

                    if (AUTO_RETRY) {
                        console.log(chalk.yellow(`🔄 Reintentando en 5 segundos automáticamente...`));
                        await sleep(5000);
                    } else {
                        const { retryAction } = await inquirer.prompt([{
                            type: 'list',
                            name: 'retryAction',
                            message: '¿Qué deseas hacer?',
                            choices: [
                                { name: 'Reintentar este candidato', value: 'retry' },
                                { name: 'Saltar al siguiente', value: 'skip' },
                                { name: 'Salir del programa', value: 'exit' }
                            ]
                        }]);

                        if (retryAction === 'retry') continue;
                        if (retryAction === 'skip') success = true;
                        if (retryAction === 'exit') process.exit(0);
                    }
                }
            }
        }
        console.log(chalk.green(`\n🏁 Partido ${partido.siglas} finalizado.`));
    }

    console.log(chalk.magenta.bold('\n✅ PROCESO COMPLETADO EXITOSAMENTE.'));
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});