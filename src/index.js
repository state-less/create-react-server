import { render } from 'react-server';
import router from './server';

(async () => {
    await render(router)
})();