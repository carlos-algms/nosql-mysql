
module.exports = is = {

};

is.empty = function() {

	var ret = [].slice.call(arguments,0).every( function( val, i, varOrig ) {

		var ret = (
			!  val 
			|| val === '0' 
			|| (
			  ! val.length 
			&& (
			       ('object' === (typeof val)) 
			    && ( ! Object.keys(val).length )
			  )
			)
		);

		return ret;
	});

	return ret;
};

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