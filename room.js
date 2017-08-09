const TAG = 'Room';
const KEY_WAITING = 'waiting';
const KEY_PLAYING = 'playing';

var config = require('config');
var app = require('express')();
var http = require('http').Server(app);
var Redis = require('ioredis');
var Memcached = require('memcached');
var redis = new Redis(config.get('room.redis'));
var memcached = new Memcached(config.get('room.memcached'));
var Anison = require('./anison.js');
var logger = Anison.Logger(TAG, Anison.LEVEL_INFO);

app.get('/', function(req, res){
	var userId = req.query.id;
	var userStatusKey = getUserStatusKey(userId);
	logger.info('userId='+userId);
	memcached.get(userStatusKey, function(err, data) {
		if(data){
			logger.error('isPlaying');
			res.send(data);
		} else {
			logger.debug('isNotPlaying');
			redis.lpop(KEY_WAITING, function(err, waitingUserId) {
				logger.debug('waitingUserId='+waitingUserId);
				if(!waitingUserId || waitingUserId === userId) {
					redis.lpush(KEY_WAITING, userId, function(err, result) {
						logger.debug('status=waiting');
						res.send('{"status":"waiting"}');
					});
				} else {
					var waitingUserStatusKey = getUserStatusKey(waitingUserId);
					memcached.getMulti([userStatusKey, waitingUserStatusKey], function(err, data){
						if(data[userStatusKey]) {
							res.send(data);
						} else if(data[waitingUserStatusKey]) {
							res.send('{"status":"waiting"}');
						} else {
							logger.debug('make room');
							var roomId = getRoomId(waitingUserId, userId);
							// cache room info
							var roomInfo = {"users":[waitingUserId, userId], "created":Date.now()};
							redis.setex(roomId, config.get('room.ttl'), JSON.stringify(roomInfo));
							// cache user status
							var userStatus = {"roomId":roomId,"status":"playing"};
							memcached.set(userStatusKey, JSON.stringify(userStatus), config.get('room.ttl'), function(err){});
							memcached.set(waitingUserStatusKey, JSON.stringify(userStatus), config.get('room.ttl'), function(err){});
							res.send(JSON.stringify(userStatus));
						}
					});
				}
			});
		}
	});
});

app.get('/login', function(req, res){
	var header=req.headers['authorization']||'',        // get the header
	token=header.split(/\s+/).pop()||'',            // and the encoded auth token
	auth=new Buffer(token, 'base64').toString(),    // convert from base64
	parts=auth.split(/:/),                          // split on colon
	username=parts[0],
	password=parts[1];	
	console.log("username="+username+",pwd="+password);
	res.send("hello");
}

http.listen(config.get('room.port'), function(){
	logger.info('listening on *:'+config.get('room.port'));
});

function getRedis(callback) {
	redis.get('foo', function (err, result) {
		logger.debug(result);
		callback(null,result);
	});
}

function getUserStatusKey(userId) {
	return 'status:'+userId;
}

function getRoomId(user1, user2) {
	return 'room:'+user1+':'+user2+':'+parseInt(Date.now()/1000);
}
