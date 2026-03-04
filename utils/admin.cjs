require('dotenv').config();
const { PrismaClient, Cargo } = require('@prisma/client');
const fs = require('fs');
const chalk = require('chalk');

const prisma = new PrismaClient();

async function main() {
  console.log(chalk.blue('🚀 Iniciando proceso de carga masiva...'));

  // 1. Cargar Partidos
  // const partidosData = JSON.parse(fs.readFileSync('./data/partidos.json', 'utf-8'));
  // for (const p of partidosData) {
  //   await prisma.partido.upsert({
  //     where: { siglas: p.siglas },
  //     update: p,
  //     create: p
  //   });
  //   console.log(chalk.green(`✔ Partido procesado: ${p.siglas}`));
  // }

  // 2. Cargar Candidatos
  const partidos = fs.readdirSync(`${process.cwd()}/data/candidatos`);

  for (const p of partidos) {
    console.log(`📂 Procesando archivo: ${p}`);
    const c = JSON.parse(fs.readFileSync(`${process.cwd()}/data/candidatos/${p}`, 'utf-8'));

    // Buscamos el ID del partido usando las siglas
    const partido = await prisma.partido.findUnique({
      where: { siglas: p.split('.')[0] }
    });

    if (!partido) {
      console.error(chalk.red(`❌ Partido no encontrado para siglas: ${p}`));
      continue;
    }

    // el archivo "c" es un json con un array de candidatos.
    await Promise.all(
      c.map((candidato) => {
        // Validamos que los cargos existan en el Enum antes de enviarlos
        const cargosValidados = candidato.cargo.filter(rol =>
          Object.values(Cargo).includes(rol)
        );

        return prisma.candidato.create({
          data: {
            ...candidato,
            cargo: cargosValidados, // Enviamos el array de strings validados
            partidoId: partido.id
          }
        })
          .then(() => console.log(chalk.green(`✔ Candidato procesado: ${candidato.nombre}`)))
          .catch(e => console.error(chalk.red(`❌ Error procesando candidato ${candidato.nombre}: ${e.message}`)));
      })
    );

    console.log(chalk.cyan(`👤 Partido procesado: ${partido.nombre}`));
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());