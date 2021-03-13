const { Component } = require('react-server/dist/server/component');
const { ClientComponent, Action } = require('react-server/dist/components');
const { publicStore } = require('../stores');
const logger = require('../lib/logger');

const Poll = Component(async (props, socket) => {
  const { values, temp, key } = props;
  const [votes, setVotes] = await Component.useState(values.map(v => 0), 'votes', { atomic: 'value=ans+x' });
  logger.warning`Used state ${votes}`

  const authenticate = ({ socket }, password) => {
    if (password === 'foobar') {
      setAuthenticated(true)
    } else {
      throw new Error('Wrong password.');
    }
  }

  const logout = () => {
    setAuthenticated(false);
  }

  const vote = async ({ socket }, option) => {
    if (!values[option]) {
      throw new Error(`Unsupported value. Supported values are ${values}`);
    }

    logger.warning`VOTING ${socket.id}`;
    logger.scope('foo').error`vote ${socket}`

    let _votes = [...votes];
    _votes[option]++;

    await setVotes(_votes);
    return { success: true }
  };

  return <ClientComponent
    values={values}
    //authenticated={authenticated} voted={hasVoted} 
    votes={votes}
  >
    <Action onClick={vote}>vote</Action>
    {/* <Action onClick={authenticate}>authenticate</Action>
      <Action onBeforeUnload={logout} /> */}
  </ClientComponent>

}, publicStore);


module.exports = { Poll };