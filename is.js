
module.exports = is = {
	
};

is.empty = function() {
	
	return [].slice.call(arguments,0).every(function( val, i, varOrig ) {
		
		return !( val.length || ('object' === (typeof a) && Object.keys(val).length) );
		
	});
}

is.string = function( v ) {
	return ( 'string' === (typeof v) );
};

is.number = function( v ) {
	return ( 'number' === (typeof v) );
};

is.array = function(v) {
	return (v instanceof Array);
};

is.object = function( v ) {
	return ( ! is.array(v)  && 'object' === (typeof v) );
};

is.function = function( v ) {
	return ( 'function' === (typeof v) );
};