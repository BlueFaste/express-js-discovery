import express from "express";
import { WebSocketServer } from "ws";
const app = express();
import * as http from "http";
const server = http.createServer(app);
import { Server} from "socket.io";
const io = new Server(server);
import mariadb from "mariadb"
const pool = mariadb.createPool({

	host: "localhost",
	user: "root",
	password: "rootPassword"

});
const db = await pool.getConnection().then( conn => {
	return conn
})

import { graphqlHTTP } from "express-graphql";
import { buildSchema} from "graphql";

var schema = buildSchema(`
  type Query {
    chanteurs: [Chanteur]
    chanteur(idChanteur:Int!): Chanteur
  }
  
	type Chanteur {
		idChanteur: Int!
		pseudo: String
		nbrConcert: Int	
		tournees:[Tournee]
	}
	
	type Tournee {
		idTournee: Int!
		nom: String
		idStyle: Int!
	}
	
	type Mutation {
		addChanteur(pseudo: String!, nbrConcert: Int): Chanteur
	}
`);


//resolver
var root = {
	chanteurs: async() => {
		let request = await db.query(
			`SELECT chanteur.idChanteur,
					chanteur.pseudo,
					chanteur.nbrConcert,
					tournee.idTournee,
					tournee.nom,
					tournee.idStyle,
					concert.idConcert,
					concert.dateConcert,
					concert.ville,
					concert.nbrPlaceVendu
			 FROM liveAddict.Chanteur AS chanteur
					  INNER JOIN liveAddict.Tournee AS tournee ON chanteur.idChanteur = tournee.idChanteur
					  INNER JOIN liveAddict.Concert AS concert ON tournee.idTournee = concert.idTournee
			`);
		console.log(request)
		return request
	},

	addChanteur: (args) => {
		console.log(args)
		return db.query(`INSERT INTO liveAddict.Chanteur (pseudo, nbrConcert) VALUES ("${args.pseudo}", ${args.nbrConcert} )`);
	},

	chanteur: async(args) => {
		const result = await db.query(`SELECT *
									   FROM liveAddict.Chanteur
									   WHERE idChanteur = ${args.idChanteur}`)
		console.log(result)
		return result[0]
	},
};

function setHeader(res) {
	return res.set({"Content-Type": "text/html; charset=utf-8"});
}

let isAdmin = false;
let loginError = false;
app.use(express.json());
app.use(express.urlencoded())

app.use("/public", express.static('./public'))

app.get('/', function(req, res) {

	res.render('./home.ejs', {isAdmin});

})
	.get('/etage/:etagenum/chambre/:chambrenum', function(req, res) {
		res = setHeader(res)
		res.render('./chambre.ejs', {
			etage: req.params.etagenum,
			chambre: req.params.chambrenum,
			tableau: isAdmin ? ['admin', 'Coralie'] : ['Thierry', 'Henry']
		});
	})
	.get('/login', function(req, res) {
		res = setHeader(res)
		res.render('./login.ejs', {loginError})
	})
	.post('/login', function(req, res) {
		console.log(req.body)
		loginError = false
		if(req.body.username === "admin" && req.body.password === "admin") {
			isAdmin = true;
			res.setHeader('Set-Cookie', 'isAdmin=' + isAdmin);
			res.redirect('/')
		} else {
			loginError = true
			res.redirect('/login')
		}
	})
	.get('/logout', function(req, res) {
		isAdmin = false;
		res.setHeader('Set-Cookie', 'isAdmin=' + isAdmin);
		res.redirect('/')
	})
	.get('/download', function(req, res) {
		const file = `./public/downloads/chat-tout-mou.gif`;
		const name = `et_un_de_plus`;
		res.download(file, name);
	})
	.get('/gif', function(req, res) {
		res = setHeader(res)
		res.render('./gif.ejs')
	})
	.get('/chat', function (req, res) {
		res = setHeader(res)
		res.render('./chat.ejs')
	})
	// .get('/chanteurs/:id', function(req, res){
	// 	console.log(req.params.id)
	// 	db.query("SELECT * FROM liveAddict.Chanteur WHERE id=" + req.params.id)
	// 		.then((rows) => {
	// 			console.log(rows); //[ {val: 1}, meta: ... ]
	// 		})
	// })

io.on('connection', (socket) => {
	console.log('a user connected');
	socket.emit('server message', 'User connected')

	// receive a message from the server
	socket.on('chat message', (msg) => {
		console.log('message: ' + msg.value);
		io.emit('chat message', msg)
	});

	socket.on('disconnect', () => {
		console.log('user disconnected');
	});
});
app.use('/graphql', graphqlHTTP({
	schema: schema,
	rootValue: root,
	graphiql: true,
}))

// app.use('/chanteurs', graphqlHTTP({
// 	schema: schema,
// 	rootValue: root,
// }))

//Gestion de la 404
app.use(function(req, res, next) {
	res.status(404).render('./404.ejs');
});

server.listen(8080, () => {
	console.log('listening on *:8080');
});
