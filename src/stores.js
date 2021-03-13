const {DynamoDBState, DynamodbStore} = require('react-server');
const { State, SocketIOBroker, Store } = require('react-server/src/server/state');

const store = new DynamodbStore({autoCreate: true, StateConstructor: DynamoDBState, TableName: 'dev2-states'});
const publicStore = store.scope('public');
      publicStore.autoCreate = true;

module.exports = {
    store,
    publicStore
} 