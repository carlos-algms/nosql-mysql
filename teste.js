/**
 * 
 * @type noSqlMySql
 */
var nosql = require('./index')({
	user	 : 'root',
	password : '123456',
	database : 'teste_db',
	host	 : 'localhost'
});

var forEach		= require('./libs/foreach');


//nosql
//	.update('users')
//	.set({
//		id	: 10,
//		name: 'Geremias',
//		age	: 25
//	})
//	.where({
//		id	: 1
//	})
//	.limit(100, 0)
//	.getSqlStr(function( sql ) {
//			console.log( sql );
//	});
	
	
//	
//nosql
//	.deleteFrom('users')
//	.where({
//		id	: 1,
//		age	: [ '>= ', 10 ]
//	})
//	.limit(100, 0)
//	.getSqlStr(function( sql ) {
//		console.log( sql );
//	});
	

nosql
	.select('*')
	.from('users_tb')
//	.where({
//		id	: 1,
//		age : [ '>=', 18 ]
//	})
//	.where('name', 'carlos')
//	.orWhere('orders', ['<=', 150])
//	.like({
//		nome : 'carlos' 
//	}, nosql.RIGHT)
//	.orNotLike({
//		nome : 'carlos' 
//	}, nosql.NONE)
//	.notLike('sobreNome', 'gomes')
//	.where('( 1 = 1 )')
//	.where('( 2 = 2 )')
//	.orWhere('( 2 = 2 )')
//	.whereIn('age', ['a', 30, 45] )
//	.orWhereIn('age', [50, 'b', 45] )
//	.whereNotIn('age', [50, 30, 'c'] )
//	.orWhereNotIn('age', [50, 30, 'd'] )
	.groupBy('age')
	.groupBy('sum')
	.getSqlStr(function( sql ) {
		console.log( sql );
	});
