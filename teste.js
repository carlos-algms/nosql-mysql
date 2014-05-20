
nosql = require('./index');


nosql()
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
	
	
