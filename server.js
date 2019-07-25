const express = require("express");
const cors = require("cors");
const knex = require("knex");
const bcrypt = require("bcrypt-nodejs");
const bodyParser = require("body-parser");

const db = knex({
    client: 'pg',
    connection: {
        host: '127.0.0.1',
        user: '',
        password: '',
        database: 'hawkeye'
    }
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
    db.select("*").from("users")
        .then(users => res.json(users))
        .catch(err => res.status(500).json("error retrieving users data"));
});

app.post("/register", (req, res) => {
    const {name, email, password} = req.body;

    const hash = bcrypt.hashSync(password);

    db.transaction(trx => {
        return trx.insert({
            email: email,
            hash: hash
        })
            .into("login")
            .returning("email")
            .then(loginEmail => {
                return trx.insert({
                    name: name,
                    email: loginEmail[0],
                    joined: new Date()
                })
                    .into("users")
                    .returning("*")
                    .then(user => {
                        if (user[0]) {
                            res.json(user[0]);
                        } else {
                            res.status(500).json("error storing user data");
                        }
                    })
                    .catch(err => res.status(500).json("error storing user data"));
            })
            .then(trx.commit)
            .catch(trx.rollback);
    })
        .catch(err => res.status(500).json("error registering new user"));
});

app.post("/signin", (req, res) => {
    const {email, password} = req.body; 

    db.select("*").from("login").where("email", "=", email)
        .then(user => {
            if (user[0]) {
                if (bcrypt.compareSync(password, user[0].hash)) {
                    db.select("*").from("users").where("email", "=", email)
                        .then(user => {
                            if (user[0]) {
                                res.json(user[0]);
                            } else {
                                res.status(400).json("no user with that email exists");
                            }
                        })
                        .catch(err => res.status(500).json("error fetching user data"));
                }
            } else {
                res.status(400).json("invalid login credentials");
            }
        })
        .catch(err => res.status(500).json("error verifying user data"));
});

app.listen(3001);