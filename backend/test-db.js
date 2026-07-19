const db = require('./database');
db.all('SELECT * FROM movies', [], (err, rows) => {
  if(err) {
    console.error("DB Error:", err);
  } else {
    console.log("DB Success, rows:", rows?.length);
  }
  process.exit(0);
});
