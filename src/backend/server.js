const bcrypt = require('bcrypt');
const { Client } = require('pg')
const express = require("express");
const app = express();
const port = 5000;
const cors = require("cors");
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);
app.use(express.json());

//connect to db
const client = new Client({
  host: "localhost",
  user: "postgres",
  port: 5432,
  password: "cghrespi",
  database: "cghdb"
})
client.connect();

app.get("/", (req, res) => {
  res.send("Received!");
}); 

app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    const hashpwd = bcrypt.hashSync(password, 10)
    //save to DB
    const result = await client.query('INSERT INTO users (email,hashpassword) VALUES ($1,$2)', [email, hashpwd]);
    res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
    if (error.code === '23505') { //error if trying to insert a duplicate value into a column
      return res.status(409).json({ error: 'There is an existing account with this email.' });
    }
    else {
      return res.status(500).json({ error: 'An error has occured.' });
    }
  }
})

app.post('/loggedin', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {    //$2b$10$Mc5SchIDyTB7AB3a5oQCmOh3ZsW5o1m0CQWqmiK8hBucjd.zPU2pq                                        
    //query DB
    const result = await client.query('select * from users where email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    const user = result.rows[0]; //return the array in result
    const trimpwd = password.trim(); //remove whitespaces or additional characters
    const trimhashpwd = user.hashpassword.trim(); //remove whitespaces or additional characters
    //compare the plaintext password in login to the hashed password in db
    const comparepwd = await bcrypt.compare(trimpwd, trimhashpwd);
    if (comparepwd) {
      return res.status(200).json({ message: 'Login successful.' });
    }
    else {
      return res.status(401).json({ error: 'Account exist but incorrect password.' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'An error has occured.' });
  }
})

app.post('/forgetpwd', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  try {                                      
    //query DB
    const result = await client.query('select * from users where email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    } else {
      return res.status(200).json({ message: 'Email is sent successful.' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'An error has occured.' });
  }
})


app.post("/fileUpload", (req, res) => {
  res.sendStatus(200);
});

app.get("/model", async (req, res) => {
  const { email } = req.headers; //retrieve email from header in frontend
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  try {
    const result = await client.query(

      `Select m.modelid, m.true_positive, m.false_positive, m.true_negative, m.false_negative, m.timestamp 
      From models m`
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No models trained.' });
    }
    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'An error has occured.' });
  }
});

app.listen(port, () => {
  console.log(`BREATHAI listening on port ${port}`);
});