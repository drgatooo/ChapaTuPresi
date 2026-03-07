const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { Data } = require('./congreso.json');
const readline = require('readline');

function deleteLastLine() {
    readline.moveCursor(process.stdout, 0, -1); // Move cursor up one line
    readline.clearLine(process.stdout, 1);     // Clear from cursor to end of line
}

async function main() {
    console.log('(1) Buscando candidatos 2026...');
    const candidatos = await prisma.candidato.findMany();
    let i = 0;
    const sonCongresistas = [];

    for await (const candidato of candidatos) {
        const nombre = `${candidato.nombre} ${candidato.apellido_p} ${candidato.apellido_m}`;

        const congresista = Data.find(c => c.TxNombres === nombre);

        if (congresista) {
            sonCongresistas.push(candidato);

            await prisma.candidato.update({
                where: { dni: candidato.dni },
                data: {
                    es_gobierno: true,
                    gobierno_url: `https://infogob.jne.gob.pe${congresista.TxRutaPolitico}`,
                    cargo_gobierno: "CONGRESISTA"
                }
            });
        } else {
            await prisma.candidato.update({
                where: { dni: candidato.dni },
                data: {
                    es_gobierno: false,
                    gobierno_url: null,
                    cargo_gobierno: null
                }
            });
        }

        deleteLastLine();
        console.log(`(${i + 1}/${candidatos.length}) Registrando congresistas (${sonCongresistas.length})...`)
        i++;
    }

    console.log(JSON.stringify(sonCongresistas.map(c => c.dni)));
}

main();

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}