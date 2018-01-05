const req = {
  send() {
    console.log('MEOW!');
  }
};

const test = require('./test');
test(req);
