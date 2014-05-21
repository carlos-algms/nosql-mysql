
var trim = function(source, char){
	if( char === undefined ) {
		char = '\ ';
	}
	else {
		char = '\\'+char;
	}
	
	var regex = new RegExp(char, 'g');
	
	return source.replace( regex, '' );
};

module.exports = trim;