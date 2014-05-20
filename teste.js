
nosql = require('./index')({
	user	 : 'root',
	password : '123456',
	database : 'teste_db',
	host	 : 'localhost'
});


nosql
	.update('users')
	.set({
		id	: 10,
		name: 'Geremias',
		age	: 25
	})
	.where({
		id	: 1
	})
	.limit(100, 0)
	.execute(function( e ) {
		
	});
	
	
