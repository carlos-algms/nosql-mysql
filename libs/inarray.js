
var inArray = function(array, search) {
	var ret = true;
	
	array.every(function(val, i) {
		
		if( val === search ) {
			ret = false;
		}
		return ret;
	});
	
	return !ret;
};

module.exports = inArray;