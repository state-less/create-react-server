const config = require('./config');
const { Server, render, Router, Route, Publish, Subscribe } = require('react-server');
const { WebSocketRenderer } = require('react-server');
const { Poll } = require('./components/Poll');
const { store, publicStore } = require('./stores');

const Target = (props)  => {
    const {children, ...rest} = props;
    const targets = Object.keys(rest);
    return <Route key="route" target={targets} >{children}</Route>
};

const prod = <Server>
    <Poll store={store} values={['foo', 'bar']} key="poll" />
</Server>

const router = <Router key="router" target={process.env.TARGET}>
    <Target serverless>
        {prod}
    </Target>
    <Target actions={['call', 'render']} target="node">
        <WebSocketRenderer port={8080} store={store}>
            {prod}
        </WebSocketRenderer>
    </Target>
</Router>;

/**
 * @description To make deployments to multiple targets easier, react-server expects a default export with the component you want to render
 */
export default router;