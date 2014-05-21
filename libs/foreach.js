
module.exports = function forEach( a, fnc ) {
	
	Object.keys(a).every(function(k) {
		
		/*
		 * Only return false if explicitly is false
		 * undefined and true will continue the loop
		 * If the user function return false, 
		 * it will break the loop imediately
		 */
		return (fnc.apply(a, [ k, a[k], a ] ) !== false);
		
	});
};