const TAG = 'Chat';
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var Anison = require('./anison.js');
var logger = Anison('chat', Anison.LEVEL_DEBUG);


if(cluster.isMaster) {
	// Fork process
	logger.debug('numCPUs='+numCPUs);

	for( var i=0; i<numCPUs; i++) {
		logger.debug("fork");
		cluster.fork();
	}

	cluster.on('exit', (worker, code, signal) => {
		logger.debug(`worker ${worker.process.pid} died`);
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
		var roomId = socket.handshake.query.roomId;
		logger.debug("connected roomId="+roomId);
		socket.join(roomId);
		socket.on('message', function(msg){
			logger.debug(roomId+'- message: ' + msg);
			io.to(roomId).emit('chat message', msg);
		});
	});

	http.listen(3000, function(){
		logger.debug('listening on *:3000');
	});
}
