var forEach = require('./foreach');

module.exports = function extend( target ) {
	var sources = [].slice.call( arguments, 1 );
	
	forEach( sources, function( key, source ) {
		
		forEach(source, function(prop, propVal ) {
			var typeOfProp = (typeof target[prop]);

			if( ! typeOfProp ) {
				typeOfProp = (typeof source[prop]);
			}

			if( typeOfProp === 'array' || typeOfProp === 'object') {
				extend( target[prop], source[prop]);

			} else {
				target[prop] = source[prop];
			}
		});
	});
	
	return target;
};