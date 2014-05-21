var mysql		= require('mysql/');
var SqlString	= require('mysql/lib/protocol/SqlString');
var is			= require('./is');
var forEach		= require('./foreach');
var extend		= require('./extend');
var trim		= require('./trim');
var inArray		= require('./inarray');

var poolManager	= require('./poolmanager');


function UserException() {
	this.message = "Can not connect to database: Invalid configuration.";

	this.toString = function(){
		return this.message;
	};
}

function noSqlMySql( passedParams ) {

	var conParams = {
		user	 : '',
		password : '',
		database : '',
		host	 : ''
	};
	
	if( ! is.empty(passedParams) ) {
		conParams = extend(conParams, passedParams);
	}


	var binds		= { },
		lastQuery	= '',
		sql			= '',
		startOfSql	= '',
		fromStr		= '',
		setsStr		= '',
		joinStr		= '',
		whereStr	= '',
		limitStr	= '',
		groupByStr	= '',
		orderByStr	= '';

	
	
	var pub = {
		NONE  : 0,
		LEFT  : 1,
		RIGHT : 2,
		BOTH  : 3,
		INNER : 4
	};
	
	
	/**
	 * Reset variables to start a new query.
	 * @returns {noSqlMySql.pub}
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
		groupByStr	= '';
		orderByStr	= '';

		return pub;
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

			var separator = ( is.empty(setsStr) ? 'SET \n    ' : ',\n    ' );
			
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
					 * Extra spaces are for identation
					 */
					separator = ',\n    ';
				});
			}
		}

		return pub;
	};


	/**
	 * Precess the SELECT part of the sql
	 * @param {Array|Object|String} cols Strings are concateneted, Arrays are joined and <br />Objects are processed and used as alias
	 * @returns {noSqlMySql.pub}
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
	 * @returns {noSqlMySql.pub}
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
	
	
	pub.join = function() {
		//TODO implement join
		return pub;
	};
	

	/**
	 * Process the WHERE part of SQL
	 * @param {String} field The col name in database
	 * @param {Array|Object|String|Number} value
	 * @returns {noSqlMySql.pub}
	 */
	pub.where = function where( field, value ) {
		return processWhere(field, value);
	};


	/**
	 * @param {String} field
	 * @param {Array|Object|String} value
	 * @returns {noSqlMySql.pub}
	 */
	pub.orWhere = function whereOr( field, value ) {
		return processWhere(field, value, 'OR ');
	};
	
	/**
	 * 
	 * @param {String} field
	 * @param {String|Number|Array} value
	 * @returns {noSqlMySql.pub}
	 */
	pub.whereIn = function( field, value ) {
		
		return preWhereIn(field, value, 'AND', 'IN');
	};
	
	/**
	 * 
	 * @param {String} field
	 * @param {String|Number|Array} value
	 * @returns {noSqlMySql.pub}
	 */
	pub.orWhereIn = function( field, value ) {
		
		return preWhereIn(field, value, 'OR', 'IN');
	};
	
	/**
	 * 
	 * @param {String} field
	 * @param {String|Number|Array} value
	 * @returns {noSqlMySql.pub}
	 */
	pub.whereNotIn = function(field, value) {
		return preWhereIn(field, value, 'AND', 'NOT IN');
	};
	
	/**
	 * @param {String} field
	 * @param {String|Number|Array} value
	 * @returns {noSqlMySql.pub}
	 */
	pub.orWhereNotIn = function(field, value) {
		return preWhereIn(field, value, 'OR', 'NOT IN');
	};
	
	
	/**
	 * 
	 * @param {String} field
	 * @param {String|Number|Array} value
	 * @param {String} operator
	 * @param {String} type
	 * @returns {noSqlMySql.pub}
	 */
	var preWhereIn	= function(field, value, operator, type ) {
		
		if( ! is.array(value) ) {
			value = [value];
		}
		
		
		value = value.map(function( v, i ){
			if( is.string(v) ) {
				v = SqlString.escape(v);
			}
			
			return v;
		});
		
		value = '( '+ value.join(', ') +' )';
		
		field = field + ' ' + type + value;
		value = null;
		
		return processWhere(field, value, operator, type);
	};
	

	/**
	 * 
	 * @param {String|Object} field
	 * @param {String} value
	 * @param {String} wildcard left | rigth | both is default
	 * @returns {noSqlMySql.pub}
	 */
	pub.like = function(field, value, wildcard) {
		return preLike(field, value, 'AND', 'LIKE', wildcard);
	};
	
	
	/**
	 * @param {String|Object} field
	 * @param {String|Number|Array} value
	 * @param {String} wildcard left | rigth | both is default
	 * @returns {noSqlMySql.pub}
	 */
	pub.orLike = function( field, value, wildcard ) {
		return preLike(field, value, 'OR', 'LIKE', wildcard );
	};
	
	
	/**
	 * @param {String|Object} field
	 * @param {String|Number|Array} value
	 * @param {String} wildcard left | rigth | both is default
	 * @returns {noSqlMySql.pub}
	 */
	pub.notLike = function( field, value, wildcard ) {
		return preLike(field, value, 'AND', 'NOT LIKE', wildcard);
	};
	
	
	/**
	 * @param {String|Object} field
	 * @param {String|Number|Array} value
	 * @param {String} wildcard left | rigth | both is default
	 * @returns {noSqlMySql.pub}
	 */
	pub.orNotLike = function( field, value, wildcard ) {
		return preLike(field, value, 'OR', 'NOT LIKE', wildcard);
	};
	
	
	/**
	 * @param {String} field
	 * @param {String|Number|Array|Object} value
	 * @param {String} operator
	 * @param {String} type
	 * @param {String} wildcard
	 * @returns {noSqlMySql.pub}
	 */
	var preLike = function( field, value, operator, type, wildcard ) {
		
		if( is.object(field) ) {
			wildcard = value;
			value = field;
			field = null;
		} 
		else if( is.array(value) ) {
			throw 'Like type queries, only accept String, Number or Objects as a value';
		}
		
		if( is.object(value) ) {
			forEach(value, function(i, v) {
				value[i] = wrapLikeValues( v, wildcard );
			});
		}
		else {
			value = wrapLikeValues(value, wildcard);
		}
		
		return processWhere( field, value, operator, type );
	};
	
	
	/**
	 * Receive a variable and concatenate % when is necessary
	 * @param {String|Number} value
	 * @param {Number} wildcard
	 * @returns {String}
	 */
	var wrapLikeValues = function( value, wildcard ) {
		value = trim(value, '%');
		
		switch( wildcard ) {
			case pub.NONE  : break;
			case pub.LEFT  : value = '%' + value; break;
			case pub.RIGHT : value = value + '%'; break;
			default		   : value = '%' + value + '%';
		}
		
		return value;
	};


	/**
	 * Verify if where is a string and add it to current SQL.
	 * If is array/object, iterate into it and add binds to corretly escape then.
	 * @param {String} field
	 * @param {Array|Object} where
	 * @param {String} operator Could be: 'AND' or 'OR'
	 * @param {String} type Could be '=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN'
	 * @returns {noSqlMySql.pub}
	 */
	var processWhere = function(field, where, operator, type) {
		
		if( is.empty(where) ) {
			
			if( is.empty( where = field ) ) {
				return pub;
			}
			
			field = null;
		}
		
		var separator = '';

		/*
		 * If not passed on parameter, the default type is AND
		 */
		if( operator === undefined ) {
			operator = 'AND';
		}
		
		/*
		 * This is the type of where that I want to concatenate
		 * starts with a new line and has a space at the end.
		 */
		operator = '\n'+operator+' ';


		/*
		 * Default type is '=', a normal where. 
		 */
		if( type === undefined ) {
			type = ' = ';
		} else {
			type = ' ' + type + ' ';
		}


		/*
		 * If the string not is empty, I need to concatenate the previous one
		 * with an separator before add this new.
		 */
		if( ! is.empty( whereStr ) ) {
			separator = operator;
		} 
		/*
		 * Aditional spaces are for identation in final str
		 */
		else {
			separator = 'WHERE\n    ';
		}
		
		
		if( field === null && ! is.object(where) ) {
//			whereStr += separator + where;
			
			if( is.string(where) ) {
				whereStr += separator + where;
			} 
			else {
				throw "if not passed the field name, the where must be a String or an Object.";
			}
			
		} else {
			if( ! is.object( where ) ) {
				var tmp = where;
				where = { };
				where[field] = tmp;
			}
			
			var isInType = (type.indexOf('IN') > -1);
			
			forEach(where, function(col, val) {
				whereStr += separator + SqlString.escapeId(col);

				/*
				 * When is array, index 0 indicates the type and 1 is the value
				 */
				if( is.array(val) ) {
					whereStr += ' ' + val[0] + ' ' + SqlString.escape(val[1]);
				} else {
					if( isInType ) {
						
					} else {
						whereStr += type + SqlString.escape(val);
					}
				}

				/*
				 * from now, separator will be the type of where
				 * because I`m sure the whereStr is not empty anymore
				 */
				separator = operator;
			});
		}

		return pub;
	};


	/**
	 *
	 * @param {Number} limit
	 * @param {Number} offset
	 * @returns {noSqlMySql.pub}
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
	 * @returns {noSqlMySql.pub}
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
	
	
	/**
	 * 
	 * @param {String} field
	 * @returns {noSqlMySql.pub}
	 */
	pub.groupBy = function(field) {
		
		var separator = ', ';
		
		if( is.empty(groupByStr) ) {
			separator = 'GROUP BY ';
		}
		
		groupByStr += separator + field;
		
		return pub;
	};
	
	
	/**
	 * Generate DELETE FROM parte os sql
	 * This method could be called 1 time per execution.
	 * It will erase the current sql and start a new one.
	 * @param {String} tableName
	 * @returns {noSqlMySql.pub}
	 */
	pub.deleteFrom = function( tableName ) {
		startOfSql = 'DELETE ';
		pub.from( tableName );
		
		return pub;
	};
	
	

	/**
	 * Execute the current SQL used via ActiveRecord
	 * @param {Function} fnc
	 * @returns {noSqlMySql.pub}
	 */
	pub.execute = function execute( fnc ) {
		buildSql();


		return executeSql( sql, fnc );
	};
	
	
	/**
	 * Process all methods and return the FULL sql string
	 * @param {Function} fnc
	 * @returns {String}
	 */
	pub.getSqlStr = function getSqlStr( fnc ) {
		var sql = buildSql();
		
		fnc && fnc.apply(null, [sql]);
		
		return sql;
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
		
		if( ! is.empty(groupByStr) ){
			parts.push(groupByStr);
		}
		
		if( ! is.empty(limitStr) ){
			parts.push(limitStr);
		}


		sql += parts.join('\n');
		
		
		var ret = sql;
		
		pub.resetQueries();
		
		return ret;
	};


	/**
	 * Execute a pre-formated SQL.
	 * @param {string} sql
	 * @param {Function} fnc
	 * @returns {undefined}
	 */
	function executeSql( sql, fnc ) {
		
		fnc || (fnc = function() {});
		
		var pool = poolManager(conParams);
		
		if( ! pool ) {
			return fnc.apply(null,[ new UserException() ]);
		}
		
		pool.getConnection( function(err, con) {
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

module.exports = noSqlMySql;