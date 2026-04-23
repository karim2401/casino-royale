const mysql = require('mysql2');

// Connect to MySQL server (without specifying a database)
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: ''
});

console.log('Connecting to MySQL...');

connection.connect((err) => {
    if (err) {
        console.error('Failed to connect to MySQL:', err);
        process.exit(1);
    }

    console.log('Connected! Creating database "if0_41729806_royal" if it does not exist...');
    
    connection.query('CREATE DATABASE IF NOT EXISTS \`if0_41729806_royal\`;', (err) => {
        if (err) {
            console.error('Error creating database:', err);
            process.exit(1);
        }
        
        console.log('Database created! The node server can now automatically connect and create tables.');
        connection.end();
    });
});
