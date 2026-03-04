const { PrismaClient, Cargo } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const chalk = require('chalk');

async function main() {
    const candidatos = await prisma.candidato.findMany();
    const formats = ['jpg', 'jpeg', 'png'];

    for await (const candidato of candidatos) {
        console.log(chalk.blue(`Processing candidato ${candidato.id} - ${candidato.nombre} ${candidato.apellido_p}`));
        // test candidato.foto_url if is valid. else replace extension with each format and test again
        let isValid = false;
        let validFormat = null;
        for (const format of formats) {
            try {
                const url = candidato.foto_url.replace(/\.\w+$/, `.${format}`);
                await axios.head(url);
                isValid = true;
                validFormat = format;
                if (url !== candidato.foto_url) mustChange = true;
                break;
            } catch (error) {
                // console.log(`URL ${url} is not valid`);
            }
        }

        if (!isValid) {
            console.log(chalk.red(`\tCandidato ${candidato.id} has an invalid foto_url: ${candidato.foto_url}`));
            console.log('Processing next candidato...');
            continue;
        }

        const newUrl = candidato.foto_url.replace(/\.\w+$/, `.${validFormat}`);
        if (newUrl !== candidato.foto_url) {
            await prisma.candidato.update({
                where: { id: candidato.id },
                data: { foto_url: newUrl },
            });
            console.log(chalk.green(`\tUpdated candidato ${candidato.id} foto_url to: ${newUrl}`));
        } else {
            console.log(chalk.yellow(`\tCandidato ${candidato.id} foto_url is already valid: ${candidato.foto_url}`));
        }

        await sleep(1000); // Sleep for 100ms to avoid overwhelming the server with requests
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main();