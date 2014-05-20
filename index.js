
var mysql		= require('mysql/');
var SqlString	= require('mysql/lib/protocol/SqlString');
var is			= require('./is');
var forEach		= require('./foreach');

var connCache	= { };
var lastConn	= null;

var getConn	= function( conParams ) {
	
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

function UserException() {
	this.message = "Can not connect to database: Invalid configuration.";

	this.toString = function(){
		return this.message;
	};
}

module.exports = function noSqlMySql(user, pass, database, host) {

	var conParams = {
		user	 : '',
		password : '',
		database : '',
		host	 : ''
	};
	
	

	/**
	 * A custom format to use :binds variables.
	 * This will increase the liberty on query build
	 * @param {string} query
	 * @param {Array|Object} values
	 * @returns {unresolved}
	 */
	conParams.queryFormat = function( query, values ) {
		if( ! values ) {
			return query;
		}

		return query.replace(
			/\:(\w+)/g,
			function( txt, key ) {
				if( values.hasOwnProperty( key ) ) {
					return this.escape( values[key] );
				}

				return txt;
			}
			.bind( this )
		);
	};


	/*
	 * Replace defaults with passed params if they are not empty
	 */
	user	 && (conParams.user = user);
	pass	 && (conParams.password = pass);
	host	 && (conParams.host = host);
	database && (conParams.database = host);


	/**
	 * Create an pool of connections to not have to connect every time
	 * a query must be executed.
	 */
	var pool = getConn(conParams);


	var binds		= { },
		lastQuery	= '',
		sql			= '',
		startOfSql	= '',
		fromStr		= '',
		setsStr		= '',
		joinStr		= '',
		whereStr	= '',
		limitStr	= '',
		orderByStr	= '';

	
	
	var pub = {};
	
	
	/**
	 * Reset variables to start a new query.
	 * @returns {wgDb.db}
	 */
	pub.resetQueries = function resetQueries() {
		binds		= {};
		sql			= '';
		startOfSql	= '';
		fromStr		= '';
		setsStr		= '';
		joinStr		= '';
		whereStr	= '';
		limitStr	= '';
		orderByStr	= '';

		return this;
	};


	/**
	 * Process cols for a SELECT query.
	 * If no cols, * is added.
	 * @param {Array|Object} cols
	 * @returns {String}
	 */
	function processCols(cols) {
		
		if( is.empty(cols) ) {
			return ( sql += "*");
		}

		if( 'string' === (typeof cols) ) {
			sql += cols + " ";

		} else {
			sql += " ?? ";
			binds.push(cols);
		}

		return sql;
	};

	/**
	 * Process the UPDATE part of the sql
	 * @param {String} tableName
	 * @returns {pub}
	 */
	pub.update = function update(tableName) {

		tableName = SqlString.escapeId(tableName);

		//TODO - add suport to array and object

		if( is.empty( startOfSql) ) {
			startOfSql = 'UPDATE ' + tableName;
			
		} else {
			startOfSql += ', ' + tableName;
			
		}

		return pub;
	};

	
	/**
	 * Process the SET parto of the sql
	 * @param {String} col
	 * @param {String|Number} val
	 * @param {Boolean} escape
	 * @returns {pub}
	 */
	pub.set = function set( col, val, escape ) {

		if( col ) {
			/*
			 * Default escape is true if not defined by user
			 */
			escape = escape === undefined || escape;

			var separator = ( is.empty(setsStr) ? 'SET ' : ',\n' );
			
			if( is.string(col) ) {

				if( val ) {
					if( escape ) {
						SqlString.escape(val);
					}
					
					setsStr += separator.concat(SqlString.escapeId(col), ' = ', val );
					
				} else {
					separator.concat(col);
					
				}

			} else {
				forEach(col, function(c, val) {
					
					if( escape ) {
						val = SqlString.escape(val);
					}

					setsStr += separator.concat(SqlString.escapeId(c), ' = ', val );

					/*
					 * At this point I`m shure that not empty, and need a coma for next item
					 */
					separator = ',\n';
				});
			}
		}

		return pub;
	};


	/**
	 * Precess the SELECT part of the sql
	 * @param {Array|Object|String} cols Strings are concateneted, Arrays are joined and <br />Objects are processed and used as alias
	 * @returns {wgDb.db}
	 */
	pub.select = function select( cols ) {

		var separator = 'SELECT ';

		if( ! is.empty(startOfSql) ) {
			separator = ', ';
		}

		/*
		 * The only reason why some user pass an object to this method
		 * Is to use alias on the names
		 */
		if( is.object( cols ) ){
			var tmp = [ ];

			forEach( cols, function( k ) {
				tmp.push( SqlString.escapeId( k ).concat( ' AS ', SqlString.escapeId( cols[k] ) ) );
			});

			startOfSql += separator.concat( tmp.join( ', ' ) );

		} else {
			if( is.string( cols ) ){
				cols = [ cols ];
			}

			/*
			 * There no *
			 */
			if( cols.indexOf( '*' ) === - 1 ){
				cols = SqlString.escapeId( cols );
			} else {
				cols = cols.join( ', ' );
			}

			startOfSql += separator.concat( cols );
		}


		return pub;
	};
	
	
	/**
	 * process the FROM part of the sql
	 * @param {String} tableName
	 * @returns {wgDb.db}
	 */
	pub.from = function from( tableName ) {

		tableName = SqlString.escapeId(tableName);

		//TODO add support to array and object
		if( is.empty(fromStr) ) {
			fromStr = 'FROM '.concat( tableName );
		} else {
			fromStr += ', ' + tableName;
		}

		return pub;
	};


	/**
	 * Process the WHERE part of SQL
	 * @param {Array|Object|String} where
	 * @returns {wgDb.db}
	 */
	pub.where = function where( where ) {
		return processWhere(where, 'AND');
	};


	/**
	 * @param {Array|Object|String} where
	 * @returns {wgDb.db}
	 */
	pub.whereOr = function whereOr( where ) {
		return processWhere(where, 'OR');
	};


	/**
	 * Verify if where is a string and add it to current SQL.
	 * If is array/object, iterate into it and add binds to corretly escape then.
	 * @param {Array|Object} where
	 * @param {String} typeOfWhere Could be: 'AND' or 'OR'
	 * @returns {wgDb.db}
	 */
	processWhere = function(where, typeOfWhere) {

		if( ! is.empty(where) ) {

			/*
			 * If not passed on parameter, the default type is AND
			 */
			if( typeOfWhere === undefined ) {
				typeOfWhere = 'AND';
			}


			/*
			 * This is the type of where that I want to concatenate
			 * starts with a new line and has a space at the end.
			 */
			typeOfWhere = '\n'+typeOfWhere+' ';

			var separator = '';


			/*
			 * If the string not is empty, I need to concatenate the previous one
			 * with an separator before add this new.
			 */
			if( ! is.empty( whereStr ) ) {
				separator = typeOfWhere;
			} else {
				/*
				 * separator starts as empty spaces to align the final string.
				 */
				separator = 'WHERE\n    ';
			}


			if( is.string(where) ) {

				whereStr += separator.concat( where );

			} else {

				forEach(where, function(col, val) {
					whereStr += separator + SqlString.escapeId(col);

					if( is.array(val) ) {
						whereStr += ' ' + val[0] + ' ' + SqlString.escape(val[1]);
					} else {
						whereStr += ' = ' + SqlString.escape(val);
					}

					/*
					 * from now, separator will be the type of where
					 * because I`m sure the whereStr is not empty anymore
					 */
					separator = typeOfWhere;
				});
			}
		}

		return pub;
	};


	/**
	 *
	 * @param {Number} limit
	 * @param {Number} offset
	 * @returns {wgDb.db}
	 */
	pub.limit = function limit(limit, offset) {
		if( limit ) {
			limitStr = 'LIMIT ';

			if( offset !== undefined && offset > 0 ) {
				limitStr += offset + ', ' + limit;
			} else {
				limitStr += limit;
			}
		}

		return pub;
	};


	/**
	 * Process the ORDER BY part of the sql
	 * @param {String} col The name of a collumn or a valid Alias
	 * @param {String} dir ASC or DESC
	 * @returns {wgDb.db}
	 */
	pub.orderBy = function orderBy( col, dir ) {

		if( col ) {
			var separator = ', ';

			if( is.empty(orderByStr) ) {
				orderByStr = 'ORDER BY ';
				separator = '';
			}

			if( ! dir ) {
				dir = 'ASC';
			}

			dir = dir.trim().toUpperCase();

			orderByStr += separator + SqlString.escapeId(col) + ' ' + dir;
		}

		return pub;
	};
	
	
	
	pub.delete = function() {
		//TODO implement delete
		return pub;
	};
	
	pub.join = function() {
		//TODO implement join
		return pub;
	};
	
	pub.like = function() {
		//TODO implement like
		return pub;
	};
	
	pub.likeOr = function() {
		//TODO implement like OR
		return pub;
	};
	
	pub.likeNot = function() {
		//TODO implement like not
		return pub;
	};
	
	pub.likeNotOr = function() {
		//TODO implement like not OR
	};
	
	pub.whereIn = function() {
		//TODO implement where in
		return pub;
	};
	
	pub.whereInOr = function() {
		//TODO implement where in OR
		return pub;
	};
	
	pub.whereNotIn = function() {
		//TODO implement where not in
		return pub;
	};
	
	pub.whereNotInOr = function() {
		//TODO implement where not in OR
		return pub;
	};
	
	pub.groupBy = function() {
		//TODO implement groubBy()
		return pub;
	};
	

	/**
	 * Execute the current SQL used via ActiveRecord
	 * @param {Function} fnc
	 * @returns {wgDb.db}
	 */
	pub.execute = function execute( fnc ) {
		buildSql();


		return executeSql( sql, fnc );
	};


	/**
	 * Join all parts of SQL created via ActiveRecord
	 * @returns {String}
	 */
	function buildSql() {

		/*
		 * Probably some one will forget to pass wath he was traing to do.
		 * If that hapens, I will force select.
		 */
		if( is.empty(startOfSql) ) {
			startOfSql = 'SELECT * ';
		}

		var parts = [ startOfSql ];

		if( ! is.empty( fromStr )){
			parts.push( fromStr );
		}

		if( ! is.empty(joinStr) ){
			parts.push( joinStr );
		}

		if( ! is.empty(setsStr) ){
			parts.push( setsStr );
		}

		if( ! is.empty(whereStr) ){
			parts.push(whereStr);
		}

		if( ! is.empty(orderByStr) ){
			parts.push(orderByStr);
		}

		if( ! is.empty(limitStr) ){
			parts.push(limitStr);
		}


		sql += parts.join('\n');

		return sql;
	};


	/**
	 * Execute a pre-formated SQL.
	 * @param {string} sql
	 * @param {Function} fnc
	 * @returns {undefined}
	 */
	function executeSql( sql, fnc ) {
		
		fnc || (fnc = function() {});
		
		var con = getConn(conParams);
		
		if( ! con ) {
			return fnc.apply(null,[ new UserException() ]);
		}
		
		getConn(conParams).getConnection( function(err, con) {
			if( ! err ) {
				con.query(sql, function( err, rows, fields ) {
					/*
					 * store it for debub purposes
					 */
					lastQuery = sql;

					fnc(err, rows, fields);

					/*
					 * IF I dont release the connection, other user will wait forever on
					 * queue because it have a limit of connections, default 10
					 */
					con.release();
				});
			};
		});
	};


	return pub;
};

