const db = require('./backend/database');
db.run("UPDATE movies SET videoUrl = 'https://drive.google.com/file/d/1gvP3J5kfx1LsslA7zOosKYQdpsVQZLNX/view?usp=sharing' WHERE title = 'IGT Rakhi'", (err) => { 
  if (err) console.error(err);
  else console.log('Database updated successfully');
});
