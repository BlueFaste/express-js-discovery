import express from "express";
import { WebSocketServer } from "ws";
const app = express();
import * as http from "http";
const server = http.createServer(app);
import { Server} from "socket.io";
const io = new Server(server);
// import mariadb from "mariadb"
// const pool = mariadb.createPool({
//
// 	host: "localhost",
// 	user: "root",
// 	password: "rootPassword"
//
// });
// const db = await pool.getConnection().then( conn => {
// 	return conn
// })

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

//Gestion de la 404
app.use(function(req, res, next) {
	res.status(404).render('./404.ejs');
});

server.listen(8080, () => {
	console.log('listening on *:8080');
});
