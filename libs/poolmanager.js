
var poolCache	= { };
var lastPool	= null;

var getPool	= function( conParams ) {
	
	if( is.empty(conParams.user, conParams.password, conParams.host, conParams.database) ) {
		ret = lastConn;
		
	} else {
		var name = [conParams.user, conParams.password, conParams.host, conParams.database].join(',');
		var ret = connCache[name];

		if( ! ret ) {
			ret = mysql.createPool(conParams);
			connCache[name] = lastConn = ret;
		}
		
	}
	
	return ret;
};

module.exports = getPool;