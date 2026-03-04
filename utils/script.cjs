const partidos = require('../data/partidos.json');
const fs = require('fs');
const path = require('path');

function getPlanSinCategoria() {
    const siglas = "SP"
    const partido = partidos.find(p => p.siglas === siglas);
    return {
        dimension_social: partido.plan_de_gobierno?.dimension_social.map(d => {delete d.categoria; return d;}) || [],
        dimension_economica: partido.plan_de_gobierno?.dimension_economica.map(d => {delete d.categoria; return d;}) || [],
        dimension_ambiental: partido.plan_de_gobierno?.dimension_ambiental.map(d => {delete d.categoria; return d;}) || [],
        dimension_institucional: partido.plan_de_gobierno?.dimension_institucional.map(d => {delete d.categoria; return d;}) || [],
    }
}

function getPresidentes() {
    const presidentes = [];
    
    // search into data/candidatos/<SIGLAS>.json for each partido
    const dir = path.join(__dirname, '../data/candidatos');
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
        const partido = partidos.find(p => p.siglas === file.split('.')[0]);
        const presidente = data.find(c => c.cargo.some(c => c === "PRESIDENTE"));
        if (presidente) {
            presidentes.push(partido.nombre + ' - ' + presidente.nombre + ' ' + presidente.apellido_p + ' ' + presidente.apellido_m);
        }
    });
    return presidentes;
}

// console.log(JSON.stringify(getPlanSinCategoria()));
console.log(getPresidentes().join('\n'));