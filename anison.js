exports.LEVEL_DEBUG = 4;
exports.LEVEL_WARN= 3;
exports.LEVEL_INFO = 2;
exports.LEVEL_ERROR = 1;
exports.Logger = function(tag, level=4) {
	return {
		debug: function(msg) {
			if(level >= 4) {
				console.log( 'D/'+tag+': '+msg );
			}
		},
		warn: function(msg) {
			if(level >= 3) {
				console.log( 'W/'+tag+': '+msg );
			}
		},
		info: function(msg) {
			if(level >= 2) {
				console.log( 'I/'+tag+': '+msg );
			}
		},
		error: function(msg) {
			if(level >= 1) {
				console.log( 'E/'+tag+': '+msg );
			}
		}
	}
}
