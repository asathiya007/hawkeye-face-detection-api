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

    if (name.trim() === "" || email.trim() === "" || password.trim() === "") {
        return res.status(400).json("incomplete data, cannot register new user");
    }

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

    if (email.trim() === "" || password.trim() === "") {
        return res.status(400).json("incomplete credentials, cannot sign in to existing user account");
    }

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
        .catch(err => res.status(500).json("error fetching user data"));
});

app.get("/profile/:id", (req, res) => {
    const {id} = req.params;

    db.select("*").from("users").where("id", "=", id)
        .then(user => {
            if (user[0]) {
                res.json(user[0]);
            } else {
                res.status(400).json("no user with that id exists");
            }
        })
        .catch(err => res.status(500).json("error fetching user data"));
});

app.put("/image", (req, res) => {
    const {id} = req.body; 
    
    db("users").where("id", "=", id)
        .increment("entries", 1)
        .returning("entries")
        .then(count => {
            if (count[0]) {
                res.json(count[0]);
            } else {
                res.status(400).json("no user with that id exists");
            }
        })
        .catch(err => res.status(500).json("error incrementing user entry count"));
});

app.listen(3001, () => console.log("server running on port 3001"));