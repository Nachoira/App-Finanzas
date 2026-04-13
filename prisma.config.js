// se importa la herramienta para cargar variables de entorno (.env)
require('dotenv').config();

module.exports= {
    //se indica donde esta la BD
    datasource: {
        url: process.env.DATABASE_URL,
    },
};