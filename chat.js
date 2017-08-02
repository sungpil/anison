var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

if(cluster.isMaster) {
	// Fork process
	console.log('numCPUs='+numCPUs);

	for( var i=0; i<numCPUs; i++) {
		console.log("fork");
		cluster.fork();
	}

	cluster.on('exit', (worker, code, signal) => {
		console.log(`worker ${worker.process.pid} died`);
	});
} else {
	// app logic
	var app = require('express')();
	var http = require('http').Server(app);
	var io = require('socket.io')(http);
	var redis = require('socket.io-redis');
	io.adapter(redis({host:'localhost',port:6379}));
	
	app.get('/', function(req, res){
		res.sendFile(__dirname + '/templates/index.html');
	});

	io.on('connection', function(socket){
		var room = "room"+socket.handshake.query.room;
		console.log("connected");
		console.log(room);
		socket.join(room);
		socket.on('chat message', function(msg){
			console.log(room+'- message: ' + msg);
			io.to(room).emit('chat message', msg);
		});
	});

	http.listen(3000, function(){
		console.log('listening on *:3000');
	});
}
