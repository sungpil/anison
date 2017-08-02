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

app.get('/', function(req, res){
	var userId = req.query.id;
	var userStatusKey = getUserStatusKey(userId);
	log('userId='+userId);
	memcached.get(userStatusKey, function(err, data) {
		if(data){
			log('isPlaying');
			res.send(data);
		} else {
			log('isNotPlaying');
			redis.lpop(KEY_WAITING, function(err, waitingUserId) {
				log('waitingUserId='+waitingUserId);
				if(!waitingUserId || waitingUserId === userId) {
					redis.lpush(KEY_WAITING, userId, function(err, result) {
						log('status=waiting');
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
							log('make room');
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

http.listen(config.get('room.port'), function(){
	log('listening on *:'+config.get('room.port'));
});

function log(msg) {
	console.log(TAG+'] '+msg);
}

function getRedis(callback) {
	redis.get('foo', function (err, result) {
		console.log(result);
		callback(null,result);
	});
}

function getUserStatusKey(userId) {
	return 'status:'+userId;
}

function getRoomId(user1, user2) {
	return 'room:'+user1+':'+user2;
}
